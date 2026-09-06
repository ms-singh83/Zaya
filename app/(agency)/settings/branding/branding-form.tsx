'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ColorInput } from '@/components/ui/color-input';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { patchWorkspaceBrandingRequestSchema, type PatchWorkspaceBrandingRequest } from '@/lib/contracts';
import { fieldErrors } from '@/lib/utils/zod-errors';

/**
 * docs/08-USER-FLOWS.md F1 step 3: "Logo upload and one brand colour. Applied to
 * Client pages, emails, and the Invoice PDF. Skippable, defaults to the Zaya
 * indigo." Direct file upload needs a Storage bucket that does not exist until
 * M3, so this collects a hosted logo URL, exactly the shape
 * `PATCH /workspace/branding` accepts today.
 */
export function BrandingForm() {
  const { workspace, isLoading, loadError, saveBranding } = useWorkspace();
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#4F46E5');
  const [errors, setErrors] = useState<Partial<Record<keyof PatchWorkspaceBrandingRequest, string>>>({});
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (workspace) {
      setLogoUrl(workspace.logo_url ?? '');
      setBrandColor(workspace.brand_color);
    }
  }, [workspace]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const request: PatchWorkspaceBrandingRequest = {
      logo_url: logoUrl.trim() === '' ? null : logoUrl.trim(),
      brand_color: brandColor,
    };
    const parsed = patchWorkspaceBrandingRequestSchema.safeParse(request);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setBanner({ tone: 'error', message: 'Check the highlighted fields and try again.' });
      return;
    }
    setErrors({});
    setIsSaving(true);
    const error = await saveBranding(parsed.data);
    setIsSaving(false);
    if (error) {
      setBanner({ tone: 'error', message: error.message });
    } else {
      setBanner({ tone: 'success', message: 'Saved.' });
    }
  }

  if (loadError) {
    return <Banner tone="error">We could not load your branding. Refresh the page to try again.</Banner>;
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {banner ? <Banner tone={banner.tone}>{banner.message}</Banner> : null}

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Shown on client pages, emails, and the invoice PDF. Skip this and the Zaya indigo is used instead.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field
            label="Logo URL"
            htmlFor="logo_url"
            error={errors.logo_url}
            hint="Paste a link to your logo (JPG or PNG). Direct upload is on the way."
          >
            {(a) => <Input {...a} type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://" />}
          </Field>

          {logoUrl.trim() ? (
            <div className="flex items-center gap-3 rounded border border-border bg-elevated p-3">
              <Image
                key={logoUrl}
                src={logoUrl}
                alt="Logo preview"
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
              <span className="text-xs text-muted">Preview</span>
            </div>
          ) : null}

          <Field label="Brand colour" htmlFor="brand_color" error={errors.brand_color}>
            {(a) => <ColorInput id={a.id} value={brandColor} onChange={setBrandColor} aria-describedby={a['aria-describedby']} aria-invalid={a['aria-invalid']} />}
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" isLoading={isSaving}>
            Save
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
