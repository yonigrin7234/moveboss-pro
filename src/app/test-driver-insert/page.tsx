'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestDriverInsertPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleInsert = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug-insert-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult({
        status: response.status,
        success: response.ok,
        data,
      });
    } catch (error) {
      setResult({
        status: 'error',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug Driver Insert Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page tests a minimal driver insert that bypasses all form complexity.
            Click the button below to attempt an insert.
          </p>

          <Button 
            onClick={handleInsert} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Inserting...' : 'Insert Test Driver'}
          </Button>

          {result && (
            <div className="space-y-2">
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    Status: {result.status} {result.success ? '✓' : '✗'}
                  </div>
                  <pre className="text-xs overflow-auto bg-muted p-3 rounded mt-2">
                    {JSON.stringify(result.data || result, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 mt-4">
            <p><strong>What to check:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>If insert fails: Check the error message for RLS/schema issues</li>
              <li>If insert succeeds but can't read back: RLS SELECT policy issue</li>
              <li>If insert succeeds: Check Supabase drivers table to confirm row exists</li>
              <li>Then check if the driver appears in /dashboard/drivers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

