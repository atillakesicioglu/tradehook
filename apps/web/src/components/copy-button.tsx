'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';

export function CopyButton({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const displayLabel = label ?? t('common.copy');

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(t('common.copied'));
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-2">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {displayLabel}
    </Button>
  );
}
