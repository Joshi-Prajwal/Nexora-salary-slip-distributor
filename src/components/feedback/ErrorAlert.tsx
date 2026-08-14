import React from 'react';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';

export const ErrorAlert: React.FC<{ message: string; title?: string }> = ({
  message,
  title = 'System Notice',
}) => {
  return (
    <Alert type="error" title={title}>
      {message}
    </Alert>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Unable to Load Data',
  message = 'An issue occurred while processing your request. Please try again or check your settings.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-rose-200 rounded-xl bg-rose-50/40">
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold mb-3">
        !
      </div>
      <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
      <p className="text-xs text-rose-700 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
