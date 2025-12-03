'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  Check,
  MessageCircle,
  Mail,
  Link2,
  QrCode,
  Download,
  ExternalLink,
  Loader2,
  ArrowRight,
  Package,
  Calendar,
  DollarSign,
} from 'lucide-react';

interface ShareLoadModalProps {
  loadIds: string[];
  isOpen: boolean;
  onClose: () => void;
  loads?: Array<{
    id: string;
    pickup_city?: string | null;
    pickup_state?: string | null;
    delivery_city?: string | null;
    delivery_state?: string | null;
    cubic_feet?: number | null;
    total_rate?: number | null;
    pickup_date?: string | null;
  }>;
}

type MessageFormat = 'whatsapp' | 'plain' | 'email';
type ExpiresIn = '1d' | '7d' | '30d' | 'never';
type ActiveView = 'share' | 'qr';

export function ShareLoadModal({ loadIds, isOpen, onClose, loads }: ShareLoadModalProps) {
  const [format, setFormat] = useState<MessageFormat>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'message' | 'link' | null>(null);
  const [createBatchLink, setCreateBatchLink] = useState(loadIds.length > 1);
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('7d');
  const [activeView, setActiveView] = useState<ActiveView>('share');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate share text when modal opens or format changes
  const generateShareText = useCallback(async () => {
    if (!isOpen || loadIds.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/sharing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-text',
          loadIds,
          format,
          includeLink: true,
          linkType: loadIds.length === 1 && !createBatchLink ? 'single' : 'batch',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessageText(data.text);
        setShareLink(data.link);
      }
    } catch (error) {
      console.error('Failed to generate share text:', error);
    } finally {
      setLoading(false);
    }
  }, [isOpen, loadIds, format, createBatchLink]);

  useEffect(() => {
    if (isOpen) {
      generateShareText();
    }
  }, [isOpen, generateShareText]);

  // Generate QR code
  const generateQRCode = useCallback(async () => {
    if (!shareLink) return;

    setQrLoading(true);
    try {
      const QRCode = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(shareLink, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setQrDataUrl(null);
    } finally {
      setQrLoading(false);
    }
  }, [shareLink]);

  useEffect(() => {
    if (activeView === 'qr' && shareLink) {
      generateQRCode();
    }
  }, [activeView, shareLink, generateQRCode]);

  const copyToClipboard = async (text: string, type: 'message' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(messageText);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const openEmail = () => {
    const subject = encodeURIComponent(
      loadIds.length === 1 ? 'Load Available' : `${loadIds.length} Loads Available`
    );
    const body = encodeURIComponent(format === 'email' ? messageText.replace(/<[^>]*>/g, '') : messageText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `load-share-qr-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const formatRoute = (load: NonNullable<typeof loads>[number]) => {
    const origin = load.pickup_city && load.pickup_state
      ? `${load.pickup_city}, ${load.pickup_state}`
      : load.pickup_city || load.pickup_state || 'Origin';
    const dest = load.delivery_city && load.delivery_state
      ? `${load.delivery_city}, ${load.delivery_state}`
      : load.delivery_city || load.delivery_state || 'Dest';
    return { origin, dest };
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border-border/60 bg-card shadow-2xl p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-xl font-semibold">
            Share {loadIds.length === 1 ? 'Load' : `${loadIds.length} Loads`}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a WhatsApp message, shareable link, or QR code
          </p>
        </DialogHeader>

        {/* View Toggle */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setActiveView('share')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeView === 'share'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Share
            </button>
            <button
              onClick={() => setActiveView('qr')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeView === 'qr'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <QrCode className="h-4 w-4" />
              QR Code
            </button>
          </div>
        </div>

        {activeView === 'share' ? (
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Column: Load Summary + Preview */}
              <div className="space-y-4">
                {/* Load Summary */}
                <div className="bg-muted/40 rounded-xl p-4">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                    {loadIds.length === 1 ? 'Load Details' : `Sharing ${loadIds.length} Loads`}
                  </Label>

                  {loads && loads.length > 0 ? (
                    <div className="space-y-2">
                      {loads.slice(0, 5).map((load, idx) => {
                        const { origin, dest } = formatRoute(load);
                        return (
                          <div key={load.id} className="flex items-center gap-3 text-sm">
                            {loadIds.length > 1 && (
                              <span className="text-muted-foreground font-medium w-4">{idx + 1}.</span>
                            )}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="truncate">{origin}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate font-medium">{dest}</span>
                            </div>
                            {load.cubic_feet && (
                              <span className="text-muted-foreground text-xs flex-shrink-0">
                                {load.cubic_feet.toLocaleString()} CF
                              </span>
                            )}
                            {load.total_rate && (
                              <span className="text-green-600 font-medium text-xs flex-shrink-0">
                                {formatCurrency(load.total_rate)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {loads.length > 5 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{loads.length - 5} more loads
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{loadIds.length} {loadIds.length === 1 ? 'load' : 'loads'} selected</span>
                    </div>
                  )}
                </div>

                {/* Format Tabs */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Format
                  </Label>
                  <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
                    {[
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'plain', label: 'Plain Text' },
                      { value: 'email', label: 'Email' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFormat(opt.value as MessageFormat)}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          format === opt.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Preview */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Message Preview
                  </Label>
                  <div className="relative">
                    {loading ? (
                      <div className="bg-slate-950 rounded-xl p-4 min-h-[180px] flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : format === 'email' ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: messageText }}
                        className="bg-white dark:bg-slate-900 rounded-xl p-4 min-h-[180px] max-h-[280px] overflow-y-auto prose prose-sm max-w-none text-sm border border-border/30"
                      />
                    ) : (
                      <pre className="bg-slate-950 text-slate-100 rounded-xl p-4 min-h-[180px] max-h-[280px] overflow-y-auto text-xs font-mono whitespace-pre-wrap leading-relaxed">
                        {messageText || 'Generating message...'}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Multi-load Options */}
                {loadIds.length > 1 && (
                  <div className="bg-muted/20 rounded-xl p-4 space-y-3 border border-border/30">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="createBatchLink"
                        checked={createBatchLink}
                        onCheckedChange={(checked) => setCreateBatchLink(!!checked)}
                      />
                      <Label htmlFor="createBatchLink" className="text-sm cursor-pointer">
                        Create temporary batch link
                      </Label>
                    </div>
                    {createBatchLink && (
                      <div className="flex items-center gap-3 pl-6">
                        <Label className="text-sm text-muted-foreground">Expires:</Label>
                        <Select value={expiresIn} onValueChange={(v) => setExpiresIn(v as ExpiresIn)}>
                          <SelectTrigger className="w-28 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1d">1 day</SelectItem>
                            <SelectItem value="7d">7 days</SelectItem>
                            <SelectItem value="30d">30 days</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="space-y-4">
                {/* Shareable Link */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Shareable Link
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="flex-1 font-mono text-xs bg-muted/30 h-9"
                      placeholder="Generating link..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => copyToClipboard(shareLink, 'link')}
                      disabled={!shareLink}
                    >
                      {copied === 'link' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Primary Action: WhatsApp */}
                <Button
                  size="lg"
                  className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold h-12 text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={openWhatsApp}
                  disabled={loading || !messageText}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Share to WhatsApp
                </Button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-10 hover:bg-muted transition-colors"
                    onClick={() => copyToClipboard(messageText, 'message')}
                    disabled={loading || !messageText}
                  >
                    {copied === 'message' ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Text
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 hover:bg-muted transition-colors"
                    onClick={() => copyToClipboard(shareLink, 'link')}
                    disabled={loading || !shareLink}
                  >
                    {copied === 'link' ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-10 hover:bg-muted transition-colors"
                  onClick={openEmail}
                  disabled={loading || !messageText}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Share via Email
                </Button>

                {/* Preview Link */}
                {shareLink && (
                  <div className="pt-2 text-center">
                    <a
                      href={shareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                    >
                      Preview shared page
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {/* Info Note */}
                <div className="pt-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    Links stay in sync with your load status. When a load is claimed or removed, it won't appear in shared links.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* QR Code View */
          <div className="px-6 py-6 flex flex-col items-center">
            <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
              {qrLoading ? (
                <div className="w-[280px] h-[280px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-[280px] h-[280px]" />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center bg-muted/20 rounded-xl">
                  <div className="text-center text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">QR code will appear here</p>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <p className="text-sm text-muted-foreground text-center mb-6">
              Scan to view {loadIds.length === 1 ? 'this load' : `these ${loadIds.length} loads`}
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-10"
                onClick={downloadQRCode}
                disabled={!qrDataUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
              <Button
                variant="outline"
                className="h-10"
                onClick={() => copyToClipboard(shareLink, 'link')}
                disabled={!shareLink}
              >
                {copied === 'link' ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>

            {/* Shareable Link */}
            <div className="mt-6 w-full max-w-md">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block text-center">
                Shareable Link
              </Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1 font-mono text-xs bg-muted/30 h-9 text-center"
                  placeholder="Generating link..."
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShareLoadModal;
