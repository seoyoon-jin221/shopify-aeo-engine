import { ProductCatalogItem, GeoGeneratedSchema } from '@shopify-geo/shared-types';

export interface GraphQLClientConfig {
  shop: string;
  accessToken: string;
  apiVersion?: string;
}

export class ShopifyGraphQLService {
  private shop: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(config: GraphQLClientConfig) {
    this.shop = config.shop;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || '2024-04';
  }

  private async executeGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const url = `https://${this.shop}/admin/api/${this.apiVersion}/graphql.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify GraphQL HTTP error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`GraphQL execution error: ${JSON.stringify(json.errors)}`);
    }

    return json.data as T;
  }

  /**
   * Fetches top products from merchant store with variants, tags, and existing GEO metafields
   */
  public async fetchProducts(first: number = 20): Promise<ProductCatalogItem[]> {
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              descriptionHtml
              vendor
              productType
              tags
              featuredImage {
                url
              }
              createdAt
              updatedAt
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    compareAtPrice
                    sku
                    availableForSale
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
              metafield(namespace: "geo_engine", key: "structured_data") {
                value
              }
            }
          }
        }
      }
    `;

    interface ProductsGraphQLResponse {
      products: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            handle: string;
            description: string;
            descriptionHtml?: string;
            vendor: string;
            productType: string;
            tags: string[];
            featuredImage?: { url: string };
            createdAt: string;
            updatedAt: string;
            variants: {
              edges: Array<{
                node: {
                  id: string;
                  title: string;
                  price: string;
                  compareAtPrice?: string;
                  sku?: string;
                  availableForSale: boolean;
                  selectedOptions: Array<{ name: string; value: string }>;
                };
              }>;
            };
            metafield?: { value: string };
          };
        }>;
      };
    }

    const data = await this.executeGraphQL<ProductsGraphQLResponse>(query, { first });

    return data.products.edges.map(({ node }) => ({
      id: node.id.replace('gid://shopify/Product/', ''),
      shopifyId: node.id,
      title: node.title,
      handle: node.handle,
      description: node.description,
      descriptionHtml: node.descriptionHtml,
      vendor: node.vendor,
      productType: node.productType,
      tags: node.tags,
      featuredImageUrl: node.featuredImage?.url,
      variants: node.variants.edges.map((v) => ({
        id: v.node.id,
        title: v.node.title,
        price: v.node.price,
        compareAtPrice: v.node.compareAtPrice,
        sku: v.node.sku,
        availableForSale: v.node.availableForSale,
        selectedOptions: v.node.selectedOptions,
      })),
      metafields: node.metafield ? { 'geo_engine.structured_data': node.metafield.value } : {},
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    }));
  }

  /**
   * Writes generated RAG JSON-LD and FAQ schema to product metafields for 1-click injection
   */
  public async syncProductMetafields(productId: string, schema: GeoGeneratedSchema): Promise<boolean> {
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            namespace
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metafields: [
        {
          ownerId: productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`,
          namespace: 'geo_engine',
          key: 'structured_data',
          type: 'json',
          value: JSON.stringify(schema.jsonLd),
        },
        {
          ownerId: productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`,
          namespace: 'geo_engine',
          key: 'faq_data',
          type: 'json',
          value: JSON.stringify(schema.faqItems),
        },
      ],
    };

    interface MetafieldsSetResponse {
      metafieldsSet: {
        metafields: Array<{ id: string }>;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }

    const result = await this.executeGraphQL<MetafieldsSetResponse>(mutation, variables);
    if (result.metafieldsSet.userErrors.length > 0) {
      throw new Error(`Metafield set error: ${JSON.stringify(result.metafieldsSet.userErrors)}`);
    }

    return true;
  }
}
