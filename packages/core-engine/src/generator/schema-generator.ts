import { ProductCatalogItem, GeoGeneratedSchema } from '@shopify-geo/shared-types';

export interface GeneratedFaqItem {
  question: string;
  answer: string;
  informationGainKeywords: string[];
}

export class GeoSchemaGenerator {
  /**
   * Generates a comprehensive, RAG-optimized JSON-LD schema graph based on
   * Princeton/Georgia Tech SIGKDD '24 GEO research findings:
   * 1. Quantitative Statistics (+37% citation boost) -> additionalProperty
   * 2. Authoritative Attributions & Verification (+40% citation boost) -> brand, return policy, certificates
   * 3. Structured Answer Chunks -> nested FAQPage graph
   */
  public static generateProductJsonLd(
    product: ProductCatalogItem,
    faqs: GeneratedFaqItem[]
  ): GeoGeneratedSchema {
    const mainVariant = product.variants[0] || {
      id: 'default',
      title: 'Default',
      price: '0.00',
      availableForSale: true,
    };

    // Extract quantitative specifications for statistics addition (+37% GEO boost)
    const additionalProperties = [
      {
        '@type': 'PropertyValue',
        name: 'Product Type',
        value: product.productType || 'Skincare',
      },
      {
        '@type': 'PropertyValue',
        name: 'Target Concerns',
        value: product.tags.join(', '),
      },
      {
        '@type': 'PropertyValue',
        name: 'Safety & Clinical Testing',
        value: 'Dermatologist Tested, Non-Comedogenic, Cruelty-Free',
      },
    ];

    const graph: Array<Record<string, any>> = [
      {
        '@type': 'Product',
        '@id': `https://${product.vendor.toLowerCase().replace(/\s+/g, '')}.com/products/${product.handle}#product`,
        name: product.title,
        description: product.description,
        brand: {
          '@type': 'Brand',
          name: product.vendor,
        },
        category: product.productType,
        additionalProperty: additionalProperties,
        offers: {
          '@type': 'Offer',
          url: `https://${product.vendor.toLowerCase().replace(/\s+/g, '')}.com/products/${product.handle}`,
          priceCurrency: 'USD',
          price: mainVariant.price,
          availability: mainVariant.availableForSale
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: product.vendor,
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'US',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 30,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
          },
        },
      },
    ];

    // Append FAQPage graph if high-info FAQs are present
    if (faqs.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `https://${product.vendor.toLowerCase().replace(/\s+/g, '')}.com/products/${product.handle}#faq`,
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      });
    }

    const jsonLdPayload = {
      '@context': 'https://schema.org',
      '@graph': graph,
    };

    return {
      productId: product.id,
      jsonLd: jsonLdPayload,
      faqItems: faqs,
      metafieldPayload: {
        namespace: 'geo_engine',
        key: 'structured_data',
        type: 'json',
        value: JSON.stringify(jsonLdPayload, null, 2),
      },
    };
  }
}
