declare const process: any;

export type QuotaAlertLevel = 'WARNING' | 'CRITICAL' | 'RECOVERED';

export interface QuotaAlertEvent {
  provider: 'perplexity' | 'openai' | 'gemini';
  statusCode: number;
  errorType: 'RATE_LIMIT_429' | 'INSUFFICIENT_CREDITS_402' | 'AUTHENTICATION_401' | 'SERVICE_UNAVAILABLE_503';
  message: string;
  timestamp: string;
  recommendedAction: string;
}

export class QuotaSentinel {
  private static alertHistory: QuotaAlertEvent[] = [];
  private static webhookUrl: string | undefined = typeof process !== 'undefined' ? process.env?.ALERT_WEBHOOK_URL : undefined;

  /**
   * Tracks and handles LLM HTTP response errors (429, 402, 401)
   */
  public static async recordApiError(
    provider: 'perplexity' | 'openai' | 'gemini',
    statusCode: number,
    responseBody: string
  ): Promise<QuotaAlertEvent | null> {
    let errorType: QuotaAlertEvent['errorType'] | null = null;
    let recommendedAction = '';

    if (statusCode === 429) {
      errorType = 'RATE_LIMIT_429';
      recommendedAction = `Rate limit reached for ${provider}. Backing off and utilizing academic fallback. Increase RPM tier on ${provider} developer dashboard.`;
    } else if (statusCode === 402 || (statusCode === 400 && responseBody.toLowerCase().includes('insufficient_quota'))) {
      errorType = 'INSUFFICIENT_CREDITS_402';
      recommendedAction = `CRITICAL: ${provider.toUpperCase()} API account is out of credits. Please top up your billing balance at ${this.getBillingUrl(provider)}.`;
    } else if (statusCode === 401 || statusCode === 403) {
      errorType = 'AUTHENTICATION_401';
      recommendedAction = `Invalid API key for ${provider}. Check your Vercel environment variables.`;
    } else if (statusCode >= 500) {
      errorType = 'SERVICE_UNAVAILABLE_503';
      recommendedAction = `${provider.toUpperCase()} servers are temporarily down. Operating in fail-safe fallback mode.`;
    }

    if (!errorType) {
      return null;
    }

    const alertEvent: QuotaAlertEvent = {
      provider,
      statusCode,
      errorType,
      message: responseBody || `HTTP ${statusCode} Error from ${provider}`,
      timestamp: new Date().toISOString(),
      recommendedAction,
    };

    this.alertHistory.push(alertEvent);

    // Format high-visibility console log
    console.error('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.error(`║ 🚨 [CRITICAL AEO QUOTA ALERT] ${provider.toUpperCase()} ${errorType} `);
    console.error(`║ Time: ${alertEvent.timestamp}`);
    console.error(`║ Action: ${alertEvent.recommendedAction}`);
    console.error('╚══════════════════════════════════════════════════════════════════════════════╝');

    // If an alert webhook (Slack / Discord / PagerDuty / Email) is configured, dispatch notification
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 *[AEO Engine Alert]* ${provider.toUpperCase()} API Error: ${errorType}\n>${alertEvent.recommendedAction}`,
          }),
        });
      } catch (webhookErr) {
        console.warn('[QuotaSentinel] Failed to dispatch webhook alert:', webhookErr);
      }
    }

    return alertEvent;
  }

  /**
   * Retrieves recent quota and rate limit incidents
   */
  public static getRecentIncidents(limit = 10): QuotaAlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Direct billing URLs for quick developer top-up
   */
  private static getBillingUrl(provider: string): string {
    switch (provider) {
      case 'perplexity':
        return 'https://www.perplexity.ai/settings/api';
      case 'openai':
        return 'https://platform.openai.com/account/billing/overview';
      case 'gemini':
        return 'https://aistudio.google.com/app/plan_information';
      default:
        return 'your provider dashboard';
    }
  }
}
