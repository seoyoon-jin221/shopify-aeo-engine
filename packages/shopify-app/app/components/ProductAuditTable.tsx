import React from 'react';
import { Card, DataTable, Button, Badge, Text, BlockStack } from '@shopify/polaris';
import { ProductCatalogItem, GeoAuditScore } from '@shopify-geo/shared-types';

interface ProductAuditTableProps {
  products: ProductCatalogItem[];
  scores: Record<string, GeoAuditScore>;
  onSyncProduct: (productId: string) => void;
  loadingSyncId?: string;
}

export const ProductAuditTable: React.FC<ProductAuditTableProps> = ({
  products,
  scores,
  onSyncProduct,
  loadingSyncId,
}) => {
  const rows = products.map((prod) => {
    const score = scores[prod.id];
    const overall = score ? score.overallScore : 0;
    const tone = overall >= 80 ? 'success' : overall >= 50 ? 'attention' : 'critical';

    return [
      <BlockStack gap="050" key={prod.id}>
        <Text as="span" variant="bodyMd" fontWeight="bold">{prod.title}</Text>
        <Text as="span" variant="bodySm" tone="subdued">{prod.vendor} • {prod.productType || 'Uncategorized'}</Text>
      </BlockStack>,
      <Badge tone={tone} key={`badge-${prod.id}`}>{`${overall} / 100`}</Badge>,
      score?.keyMissingEntities?.[0] || 'No critical gaps',
      <Button
        size="micro"
        variant="primary"
        loading={loadingSyncId === prod.id}
        onClick={() => onSyncProduct(prod.id)}
        key={`btn-${prod.id}`}
      >
        1-Click Fix
      </Button>,
    ];
  });

  return (
    <Card roundedAbove="sm">
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'numeric']}
        headings={['Product Catalog', 'AI Search Score', 'Top Entity Gap', 'Action']}
        rows={rows}
      />
    </Card>
  );
};
