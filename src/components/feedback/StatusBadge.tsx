import React from 'react';
import { Badge } from '../common/Badge';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  const getVariantAndLabel = (s: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string } => {
    switch (s) {
      case 'IDENTIFIED':
        return { variant: 'success', label: 'Identified' };
      case 'READY':
      case 'CONFIRMED':
        return { variant: 'success', label: 'Ready' };
      case 'SENT':
      case 'DELIVERED':
        return { variant: 'success', label: 'Delivered' };
      case 'PARTIALLY_IDENTIFIED':
        return { variant: 'info', label: 'Partially identified' };
      case 'DUPLICATE':
      case 'DUPLICATE_CONTENT':
        return { variant: 'warning', label: 'Duplicate' };
      case 'NEEDS_REVIEW':
      case 'REVIEW_REQUIRED':
        return { variant: 'warning', label: 'Needs review' };
      case 'QUEUED':
        return { variant: 'warning', label: 'Queued' };
      case 'PENDING':
        return { variant: 'warning', label: 'Pending' };
      case 'RETRYING':
        return { variant: 'warning', label: 'Retrying' };
      case 'PROCESSING':
        return { variant: 'info', label: 'Processing' };
      case 'TEXT_EXTRACTION_FAILED':
        return { variant: 'error', label: 'Extraction failed' };
      case 'ERROR':
        return { variant: 'error', label: 'Error' };
      case 'NOT_IDENTIFIED':
      case 'UNMATCHED':
        return { variant: 'neutral', label: 'Not identified' };
      case 'REJECTED':
        return { variant: 'error', label: 'Rejected' };
      case 'FAILED':
        return { variant: 'error', label: 'Failed' };
      default:
        return { variant: 'neutral', label: status };
    }
  };

  const { variant, label } = getVariantAndLabel(normalized);

  return <Badge variant={variant}>{label}</Badge>;
};
