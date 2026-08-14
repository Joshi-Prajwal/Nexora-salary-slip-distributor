import React from 'react';
import { Badge } from '../common/Badge';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  const getVariantAndLabel = (s: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string } => {
    switch (s) {
      case 'READY':
        return { variant: 'success', label: 'Ready' };
      case 'CONFIRMED':
        return { variant: 'success', label: 'Confirmed' };
      case 'SENT':
      case 'DELIVERED':
        return { variant: 'success', label: 'Delivered' };
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
      case 'ERROR':
      case 'UNMATCHED':
        return { variant: 'neutral', label: 'Not Identified' };
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
