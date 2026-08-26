import React from 'react';
import { Card, Text, BlockStack, InlineGrid, ProgressBar, Badge, Box } from '@shopify/polaris';
import { GeoAuditScore } from '@shopify-geo/shared-types';

interface PolarisAuditScorecardProps {
  score: GeoAuditScore;
}

export const PolarisAuditScorecard: React.FC<PolarisAuditScorecardProps> = ({ score }) => {
  const getBadgeTone = (val: number): 'success' | 'attention' | 'critical' => {
    if (val >= 80) return 'success';
    if (val >= 50) return 'attention';
    return 'critical';
  };

  const getProgressTone = (val: number): 'success' | 'primary' | 'critical' => {
    if (val >= 80) return 'success';
    if (val >= 50) return 'primary';
    return 'critical';
  };

  return (
    <Card roundedAbove="sm">
      <BlockStack gap="400">
        <InlineGrid columns="1fr auto">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              AI Citation Readiness Score
            </Text>
            <Text as="p" tone="subdued">
              Measures how likely this product is cited by ChatGPT Search, Perplexity, and AI Overviews.
            </Text>
          </BlockStack>
          <Box paddingBlockStart="100">
            <Badge tone={getBadgeTone(score.overallScore)}>
              {`${score.overallScore} / 100`}
            </Badge>
          </Box>
        </InlineGrid>

        <ProgressBar progress={score.overallScore} tone={getProgressTone(score.overallScore)} size="small" />

        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Brand Citations</Text>
              <Text as="p" variant="headingSm">{score.breakdown.brandCitationRate} / 30</Text>
            </BlockStack>
          </Box>

          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Entity Depth</Text>
              <Text as="p" variant="headingSm">{score.breakdown.entityCompleteness} / 25</Text>
            </BlockStack>
          </Box>

          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Information Gain</Text>
              <Text as="p" variant="headingSm">{score.breakdown.informationGainScore} / 25</Text>
            </BlockStack>
          </Box>

          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Schema Readiness</Text>
              <Text as="p" variant="headingSm">{score.breakdown.structuredDataReadiness} / 20</Text>
            </BlockStack>
          </Box>
        </InlineGrid>
      </BlockStack>
    </Card>
  );
};
