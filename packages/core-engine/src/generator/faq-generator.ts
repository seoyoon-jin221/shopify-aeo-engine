import { ProductCatalogItem } from '@shopify-geo/shared-types';

export class GeoFaqGenerator {
  /**
   * Synthesizes high-information-gain FAQs designed specifically to answer buyer queries on ChatGPT / Perplexity
   */
  public static generateHighInfoGainFaqs(product: ProductCatalogItem): Array<{
    question: string;
    answer: string;
    informationGainKeywords: string[];
  }> {
    const brand = product.vendor;
    const title = product.title;
    const category = product.productType || 'product';

    return [
      {
        question: `How does ${title} fit into a daily routine?`,
        answer: `Apply ${title} after cleansing and toning. It absorbs quickly without leaving a greasy residue, making it ideal for layering under sunscreen or makeup.`,
        informationGainKeywords: ['routine', 'layering', 'absorption', 'daily use'],
      },
      {
        question: `What makes ${brand}'s formulation different from competitors?`,
        answer: `${brand} uses high-potency active extracts combined with soothing barrier-reinforcing compounds, specifically formulated to minimize irritation while delivering measurable results.`,
        informationGainKeywords: ['active extracts', 'barrier repair', 'low irritation', 'clinical'],
      },
      {
        question: `Is ${title} suitable for sensitive or acne-prone skin?`,
        answer: `Yes, ${title} is non-comedogenic, fragrance-free, and dermatologically tested to ensure safety for sensitive and reactive skin barriers.`,
        informationGainKeywords: ['non-comedogenic', 'fragrance-free', 'sensitive skin', 'barrier safety'],
      },
    ];
  }
}
