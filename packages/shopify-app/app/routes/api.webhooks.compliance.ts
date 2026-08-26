declare const require: any;
declare const Buffer: any;

export interface WebhookContext {
  topic: string;
  shop: string;
  body: string;
  hmacHeader: string;
  apiSecret: string;
}

/**
 * Validates Shopify cryptographic HMAC signature
 */
export function verifyShopifyWebhookHmac(ctx: WebhookContext): boolean {
  if (!ctx.hmacHeader || !ctx.apiSecret) {
    return false;
  }
  try {
    const crypto = require('crypto');
    const digest = crypto
      .createHmac('sha256', ctx.apiSecret)
      .update(ctx.body, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(ctx.hmacHeader));
  } catch (e) {
    return false;
  }
}

/**
 * Mandatory Shopify GDPR Compliance & Lifecycle Webhook Handlers
 */
export class ShopifyComplianceWebhooks {
  /**
   * 1. customers/data_request (Mandatory GDPR)
   */
  public static async handleCustomerDataRequest(shop: string, payload: any): Promise<{ success: boolean; data: any }> {
    console.log(`[GDPR] Customer data request received for shop: ${shop}`, payload);
    return {
      success: true,
      data: {
        message: 'AEO Engine only processes public product catalog metadata and does not store individual customer PII.',
      },
    };
  }

  /**
   * 2. customers/redact (Mandatory GDPR)
   */
  public static async handleCustomerRedact(shop: string, payload: any): Promise<{ success: boolean }> {
    console.log(`[GDPR] Customer redact request received for shop: ${shop}`, payload);
    return { success: true };
  }

  /**
   * 3. shop/redact (Mandatory GDPR - 48h after app uninstall)
   */
  public static async handleShopRedact(shop: string, payload: any): Promise<{ success: boolean }> {
    console.log(`[GDPR] Shop redact request received for shop: ${shop}`, payload);
    return { success: true };
  }

  /**
   * 4. app/uninstalled (Fired when merchant removes app)
   */
  public static async handleAppUninstalled(shop: string, payload: any): Promise<{ success: boolean }> {
    console.log(`[Lifecycle] App uninstalled for shop: ${shop}`, payload);
    return { success: true };
  }
}
