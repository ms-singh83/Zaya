'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { GstinInput } from '@/components/ui/gstin-input';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { patchWorkspaceRequestSchema, type PatchWorkspaceRequest } from '@/lib/contracts';
import { SUPPORTED_GST_RATES_BPS } from '@/lib/domain';
import { GST_STATES } from '@/lib/reference/gst-states';
import { fieldErrors } from '@/lib/utils/zod-errors';

type FormState = {
  name: string;
  legal_name: string;
  gstin: string;
  pan: string;
  state_code: string;
  default_hsn_sac: string;
  default_gst_rate_bps: number;
  address_line1: string;
  address_line2: string;
  city: string;
  pincode: string;
  invoice_prefix: string;
  payment_terms_days: number;
  auto_invoice_buffer_minutes: number;
};

function toFormState(w: { [K in keyof FormState]?: FormState[K] | null }): FormState {
  return {
    name: w.name ?? '',
    legal_name: w.legal_name ?? '',
    gstin: w.gstin ?? '',
    pan: w.pan ?? '',
    state_code: w.state_code ?? '',
    default_hsn_sac: w.default_hsn_sac ?? '',
    default_gst_rate_bps: w.default_gst_rate_bps ?? 1800,
    address_line1: w.address_line1 ?? '',
    address_line2: w.address_line2 ?? '',
    city: w.city ?? '',
    pincode: w.pincode ?? '',
    invoice_prefix: w.invoice_prefix ?? 'INV',
    payment_terms_days: w.payment_terms_days ?? 7,
    auto_invoice_buffer_minutes: w.auto_invoice_buffer_minutes ?? 0,
  };
}

/** Empty text fields mean "not set" (null), not the empty string, for every nullable contract field. */
function toPatchRequest(form: FormState): PatchWorkspaceRequest {
  const blankToNull = (v: string) => (v.trim() === '' ? null : v.trim());
  const stateName = GST_STATES.find((s) => s.code === form.state_code)?.name ?? null;
  return {
    name: form.name.trim(),
    legal_name: blankToNull(form.legal_name),
    gstin: blankToNull(form.gstin),
    pan: blankToNull(form.pan),
    state_code: blankToNull(form.state_code),
    state: stateName,
    default_hsn_sac: blankToNull(form.default_hsn_sac),
    default_gst_rate_bps: form.default_gst_rate_bps,
    address_line1: blankToNull(form.address_line1),
    address_line2: blankToNull(form.address_line2),
    city: blankToNull(form.city),
    pincode: blankToNull(form.pincode),
    invoice_prefix: form.invoice_prefix.trim(),
    payment_terms_days: form.payment_terms_days,
    auto_invoice_buffer_minutes: form.auto_invoice_buffer_minutes,
  };
}

/**
 * docs/08-USER-FLOWS.md F1 step 2. Validates against the frozen
 * `patchWorkspaceRequestSchema` (lib/contracts/workspace.ts) so the rules the real
 * API will enforce (GSTIN shape, PAN shape, buffer range) are the ones shown here,
 * not a second copy of them (CLAUDE.md §6).
 */
export function BusinessForm() {
  const { workspace, isLoading, loadError, saveBusiness } = useWorkspace();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof PatchWorkspaceRequest, string>>>({});
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (workspace) setForm(toFormState(workspace));
  }, [workspace]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBanner(null);
    const request = toPatchRequest(form);
    const parsed = patchWorkspaceRequestSchema.safeParse(request);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setBanner({ tone: 'error', message: 'Check the highlighted fields and try again.' });
      return;
    }
    setErrors({});
    setIsSaving(true);
    const error = await saveBusiness(parsed.data);
    setIsSaving(false);
    if (error) {
      setBanner({ tone: 'error', message: error.message });
      if (error.field) setErrors((prev) => ({ ...prev, [error.field as keyof PatchWorkspaceRequest]: error.message }));
    } else {
      setBanner({ tone: 'success', message: 'Saved.' });
    }
  }

  if (loadError) {
    return <Banner tone="error">We could not load your business details. Refresh the page to try again.</Banner>;
  }

  if (isLoading || !form) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {banner ? <Banner tone={banner.tone}>{banner.message}</Banner> : null}

      <Card>
        <CardHeader>
          <CardTitle>Business identity</CardTitle>
          <CardDescription>How your agency is named on invoices and client pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Display name" htmlFor="name" error={errors.name} required>
            {(a) => <Input {...a} value={form.name} onChange={(e) => update('name', e.target.value)} />}
          </Field>
          <Field label="Legal name" htmlFor="legal_name" error={errors.legal_name} hint="As registered with the government, if different.">
            {(a) => <Input {...a} value={form.legal_name} onChange={(e) => update('legal_name', e.target.value)} />}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GST details</CardTitle>
          <CardDescription>Needed before an invoice can be issued, not before a deliverable can be sent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" htmlFor="gstin" error={errors.gstin} hint="Leave blank if you are not GST-registered.">
              {(a) => <GstinInput {...a} value={form.gstin} onChange={(e) => update('gstin', e.target.value)} />}
            </Field>
            <Field label="PAN" htmlFor="pan" error={errors.pan}>
              {(a) => (
                <Input
                  {...a}
                  value={form.pan}
                  maxLength={10}
                  autoCapitalize="characters"
                  onChange={(e) => update('pan', e.target.value.toUpperCase())}

                />
              )}
            </Field>
            <Field label="State" htmlFor="state_code" error={errors.state_code} hint="Drives place of supply on invoices." required>
              {(a) => (
                <Select
                  {...a}
                  value={form.state_code}
                  onChange={(e) => update('state_code', e.target.value)}

                >
                  <option value="">Select a state</option>
                  {GST_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Default GST rate" htmlFor="default_gst_rate_bps" error={errors.default_gst_rate_bps}>
              {(a) => (
                <Select
                  {...a}
                  value={form.default_gst_rate_bps}
                  onChange={(e) => update('default_gst_rate_bps', Number(e.target.value))}

                >
                  {SUPPORTED_GST_RATES_BPS.map((bps) => (
                    <option key={bps} value={bps}>
                      {bps / 100}%
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Default HSN / SAC"
              htmlFor="default_hsn_sac"
              error={errors.default_hsn_sac}
              className="sm:col-span-2"
              hint="Pre-fills new deliverables. You can change it per deliverable."
            >
              {(a) => <Input {...a} value={form.default_hsn_sac} onChange={(e) => update('default_hsn_sac', e.target.value)} />}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered address</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Address line 1" htmlFor="address_line1" error={errors.address_line1}>
            {(a) => <Input {...a} value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} />}
          </Field>
          <Field label="Address line 2" htmlFor="address_line2" error={errors.address_line2}>
            {(a) => <Input {...a} value={form.address_line2} onChange={(e) => update('address_line2', e.target.value)} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="city" error={errors.city}>
              {(a) => <Input {...a} value={form.city} onChange={(e) => update('city', e.target.value)} />}
            </Field>
            <Field label="PIN code" htmlFor="pincode" error={errors.pincode}>
              {(a) => (
                <Input
                  {...a}
                  value={form.pincode}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => update('pincode', e.target.value.replace(/\D/g, ''))}

                />
              )}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoicing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Invoice number prefix" htmlFor="invoice_prefix" error={errors.invoice_prefix} required>
              {(a) => (
                <Input
                  {...a}
                  value={form.invoice_prefix}
                  onChange={(e) => update('invoice_prefix', e.target.value.toUpperCase())}

                />
              )}
            </Field>
            <Field label="Payment terms (days)" htmlFor="payment_terms_days" error={errors.payment_terms_days}>
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  min={0}
                  max={365}
                  value={form.payment_terms_days}
                  onChange={(e) => update('payment_terms_days', Number(e.target.value))}

                />
              )}
            </Field>
            <Field
              label="Auto-invoice buffer (minutes)"
              htmlFor="auto_invoice_buffer_minutes"
              error={errors.auto_invoice_buffer_minutes}
              hint="Time to catch a mistake before the invoice sends. Up to 1440 (24 hours)."
            >
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  min={0}
                  max={1440}
                  value={form.auto_invoice_buffer_minutes}
                  onChange={(e) => update('auto_invoice_buffer_minutes', Number(e.target.value))}

                />
              )}
            </Field>
          </div>
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
