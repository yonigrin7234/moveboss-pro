'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DocumentType = {
  value: string;
  label: string;
  category: string;
};

type UploadDocumentFormProps = {
  companies: { id: string; name: string }[];
  documentTypes: readonly DocumentType[];
  userId: string;
};

export function UploadDocumentForm({ companies, documentTypes, userId }: UploadDocumentFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_id: '',
    document_type: '',
    document_name: '',
    description: '',
    effective_date: '',
    expiration_date: '',
    insurance_company: '',
    policy_number: '',
    coverage_amount: '',
  });

  const selectedDocType = documentTypes.find((t) => t.value === formData.document_type);
  const isInsuranceDoc = selectedDocType?.category === 'insurance';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadedUrl(result.url || result.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedUrl) {
      setError('Please upload a file first');
      return;
    }

    if (!formData.company_id || !formData.document_type || !formData.document_name) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/compliance-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          file_url: uploadedUrl,
          file_name: selectedFile?.name,
          file_size: selectedFile?.size,
          file_type: selectedFile?.type,
          coverage_amount: formData.coverage_amount
            ? parseFloat(formData.coverage_amount)
            : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create document');
      }

      router.push('/dashboard/compliance');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* File Upload */}
      <div className="space-y-2">
        <Label>Document File *</Label>
        {!selectedFile ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, PNG, JPG (max 10MB)</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Company */}
      <div className="space-y-2">
        <Label htmlFor="company_id">Company *</Label>
        <Select
          value={formData.company_id}
          onValueChange={(value) => setFormData({ ...formData, company_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Type */}
      <div className="space-y-2">
        <Label htmlFor="document_type">Document Type *</Label>
        <Select
          value={formData.document_type}
          onValueChange={(value) => setFormData({ ...formData, document_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {documentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Name */}
      <div className="space-y-2">
        <Label htmlFor="document_name">Document Name *</Label>
        <Input
          id="document_name"
          value={formData.document_name}
          onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
          placeholder="e.g., ABC Trucking W-9 2024"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional notes about this document"
          rows={2}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="effective_date">Effective Date</Label>
          <Input
            id="effective_date"
            type="date"
            value={formData.effective_date}
            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiration_date">Expiration Date</Label>
          <Input
            id="expiration_date"
            type="date"
            value={formData.expiration_date}
            onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
          />
        </div>
      </div>

      {/* Insurance-specific fields */}
      {isInsuranceDoc && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm font-medium">Insurance Details</p>
          <div className="space-y-2">
            <Label htmlFor="insurance_company">Insurance Company</Label>
            <Input
              id="insurance_company"
              value={formData.insurance_company}
              onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
              placeholder="e.g., Progressive Commercial"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="policy_number">Policy Number</Label>
              <Input
                id="policy_number"
                value={formData.policy_number}
                onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                placeholder="e.g., POL-123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverage_amount">Coverage Amount ($)</Label>
              <Input
                id="coverage_amount"
                type="number"
                step="0.01"
                value={formData.coverage_amount}
                onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                placeholder="1000000"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting || isUploading || !uploadedUrl}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Upload Document'
        )}
      </Button>
    </form>
  );
}
