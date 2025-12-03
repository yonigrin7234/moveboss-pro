'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Eye,
  EyeOff,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  DollarSign,
  Phone,
  Lock,
  MessageSquare,
  Image as ImageIcon,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Settings {
  public_board_enabled: boolean;
  public_board_slug: string;
  public_board_show_rates: boolean;
  public_board_show_contact: boolean;
  public_board_require_auth_to_claim: boolean;
  public_board_custom_message: string;
  public_board_logo_url: string;
}

interface PublicBoardSettingsClientProps {
  initialSettings: Settings;
  companyName: string;
  baseUrl: string;
}

export function PublicBoardSettingsClient({
  initialSettings,
  companyName,
  baseUrl,
}: PublicBoardSettingsClientProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const boardUrl = settings.public_board_slug
    ? `${baseUrl}/board/${settings.public_board_slug}`
    : null;

  // Check slug availability with debounce
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const response = await fetch('/api/sharing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      if (response.ok) {
        const data = await response.json();
        setSlugAvailable(data.available);
      }
    } catch (e) {
      console.error('Error checking slug:', e);
    } finally {
      setCheckingSlug(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (settings.public_board_slug !== initialSettings.public_board_slug) {
        checkSlugAvailability(settings.public_board_slug);
      } else {
        setSlugAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [settings.public_board_slug, initialSettings.public_board_slug, checkSlugAvailability]);

  // Generate QR code
  useEffect(() => {
    if (boardUrl) {
      import('qrcode').then(QRCode => {
        QRCode.toDataURL(boardUrl, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        }).then(setQrDataUrl);
      });
    }
  }, [boardUrl]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/sharing/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (e) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyBoardUrl = async () => {
    if (!boardUrl) return;
    try {
      await navigator.clipboard.writeText(boardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Public Load Board</h1>
          <p className="text-sm text-muted-foreground">
            Configure how carriers can view and claim your loads
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-600" />
              Saved
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enable/Disable */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Public Board Status</CardTitle>
                    <CardDescription>Enable or disable your public load board</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.public_board_enabled}
                  onCheckedChange={(checked) => updateSetting('public_board_enabled', checked)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {settings.public_board_enabled ? (
                  <>
                    <Badge variant="default" className="bg-green-600">
                      <Eye className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Your load board is visible to anyone with the link
                    </span>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Your load board is hidden from the public
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Board URL */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Board URL
              </CardTitle>
              <CardDescription>
                Customize your public load board URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm text-muted-foreground">{baseUrl}/board/</span>
                  <div className="relative flex-1">
                    <Input
                      id="slug"
                      value={settings.public_board_slug}
                      onChange={(e) => updateSetting('public_board_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="your-company"
                      className={
                        slugAvailable === false
                          ? 'border-destructive'
                          : slugAvailable === true
                            ? 'border-green-500'
                            : ''
                      }
                    />
                    {checkingSlug && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>
                </div>
                {slugAvailable === false && (
                  <p className="text-sm text-destructive mt-1">This slug is already taken</p>
                )}
                {slugAvailable === true && (
                  <p className="text-sm text-green-600 mt-1">This slug is available</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Use lowercase letters, numbers, and hyphens only
                </p>
              </div>

              {boardUrl && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Input
                    value={boardUrl}
                    readOnly
                    className="flex-1 text-sm font-mono"
                  />
                  <Button variant="outline" size="sm" onClick={copyBoardUrl}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={boardUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control what information is visible on your public board
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Show Rates</p>
                    <p className="text-sm text-muted-foreground">
                      Display rate per cubic foot and total payout
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.public_board_show_rates}
                  onCheckedChange={(checked) => updateSetting('public_board_show_rates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Show Contact Info</p>
                    <p className="text-sm text-muted-foreground">
                      Display your company phone and email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.public_board_show_contact}
                  onCheckedChange={(checked) => updateSetting('public_board_show_contact', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Require Login to Claim</p>
                    <p className="text-sm text-muted-foreground">
                      Carriers must sign in to claim loads
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.public_board_require_auth_to_claim}
                  onCheckedChange={(checked) => updateSetting('public_board_require_auth_to_claim', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Customization */}
          <Card>
            <CardHeader>
              <CardTitle>Customization</CardTitle>
              <CardDescription>
                Personalize your public load board
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom_message" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Welcome Message
                </Label>
                <Textarea
                  id="custom_message"
                  value={settings.public_board_custom_message}
                  onChange={(e) => updateSetting('public_board_custom_message', e.target.value)}
                  placeholder="Welcome to our load board! We offer competitive rates and reliable service."
                  className="mt-1.5"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This message appears at the top of your public board
                </p>
              </div>

              <div>
                <Label htmlFor="logo_url" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Logo URL
                </Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={settings.public_board_logo_url}
                  onChange={(e) => updateSetting('public_board_logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the URL of your company logo (square images work best)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Column */}
        <div className="space-y-6">
          {/* QR Code */}
          {boardUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </CardTitle>
                <CardDescription>
                  Scan to access your load board
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {qrDataUrl ? (
                  <>
                    <div className="bg-white p-3 rounded-lg">
                      <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.download = `${settings.public_board_slug || 'loadboard'}-qr.png`;
                        link.href = qrDataUrl;
                        link.click();
                      }}
                    >
                      Download PNG
                    </Button>
                  </>
                ) : (
                  <div className="w-40 h-40 bg-muted rounded-lg flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                How your board appears to carriers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border/50 rounded-lg overflow-hidden">
                {/* Mini Preview Header */}
                <div className="bg-card p-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    {settings.public_board_logo_url ? (
                      <img
                        src={settings.public_board_logo_url}
                        alt="Logo"
                        className="w-8 h-8 rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{companyName}</p>
                      <p className="text-xs text-muted-foreground">Load Board</p>
                    </div>
                  </div>
                </div>

                {/* Mini Preview Content */}
                <div className="p-3 space-y-3">
                  {settings.public_board_custom_message && (
                    <div className="bg-primary/5 rounded p-2">
                      <p className="text-xs line-clamp-2">{settings.public_board_custom_message}</p>
                    </div>
                  )}

                  {/* Sample Load Card */}
                  <div className="bg-muted/30 rounded p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">Los Angeles → New York</p>
                      <Badge variant="secondary" className="text-[10px] h-5">HHG</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>1,200 CF</span>
                      {settings.public_board_show_rates && (
                        <span className="text-green-600 font-medium">$4,200</span>
                      )}
                    </div>
                  </div>

                  {settings.public_board_show_contact && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>(555) 123-4567</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
