import React from 'react';
import { Badge } from '../common/Badge';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  const getVariantAndLabel = (s: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string } => {
    switch (s) {
      case 'EXACT_MATCH':
        return { variant: 'success', label: 'Exact match' };
      case 'STRONG_MATCH':
        return { variant: 'success', label: 'Strong match' };
      case 'MANUALLY_CONFIRMED':
      case 'CONFIRMED':
        return { variant: 'success', label: 'Confirmed' };
      case 'IDENTIFIED':
        return { variant: 'success', label: 'Identified' };
      case 'READY':
        return { variant: 'success', label: 'Ready' };
      case 'SENT':
      case 'DELIVERED':
        return { variant: 'success', label: 'Delivered' };

      case 'POSSIBLE_MATCH':
        return { variant: 'warning', label: 'Possible match' };
      case 'NEEDS_OCR':
        return { variant: 'warning', label: 'Needs OCR' };
      case 'DUPLICATE':
      case 'DUPLICATE_CONTENT':
        return { variant: 'warning', label: 'Duplicate' };
      case 'NEEDS_REVIEW':
      case 'REVIEW_REQUIRED':
      case 'MANUAL_REVIEW':
        return { variant: 'warning', label: 'Needs review' };
      case 'QUEUED':
        return { variant: 'warning', label: 'Queued' };
      case 'PENDING':
        return { variant: 'warning', label: 'Pending' };

      case 'CONFLICT':
        return { variant: 'error', label: 'Conflict' };
      case 'MANUALLY_REJECTED':
      case 'REJECTED':
        return { variant: 'error', label: 'Rejected' };
      case 'TEXT_EXTRACTION_FAILED':
        return { variant: 'error', label: 'Extraction failed' };
      case 'ERROR':
      case 'FAILED':
        return { variant: 'error', label: 'Failed' };

      case 'PARTIALLY_IDENTIFIED':
        return { variant: 'info', label: 'Partially identified' };
      case 'OCR_PROCESSING':
        return { variant: 'info', label: 'OCR processing' };
      case 'PROCESSING':
        return { variant: 'info', label: 'Processing' };

      case 'NO_MATCH':
      case 'UNMATCHED':
      case 'NOT_IDENTIFIED':
        return { variant: 'neutral', label: 'No match' };
      default:
        return { variant: 'neutral', label: status.replace(/_/g, ' ') };
    }
  };

  const { variant, label } = getVariantAndLabel(normalized);

  return <Badge variant={variant}>{label}</Badge>;
};
