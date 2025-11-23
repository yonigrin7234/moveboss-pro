import { supabase } from '@/lib/supabaseClient';
import { Company } from '@/lib/types';

export default async function TestPage() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .returns<Company[]>();

  return (
    <div style={{ padding: 24 }}>
      <h1>Supabase Companies Test</h1>
      
      {error && (
        <div style={{ 
          padding: 16, 
          marginBottom: 24, 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: 4 
        }}>
          <strong>Error:</strong> {error.code} - {error.message}
        </div>
      )}

      {data && (
        <>
          <h2 style={{ marginTop: 24, marginBottom: 16 }}>Companies ({data.length})</h2>
          
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.map((company: Company) => (
              <li 
                key={company.id}
                style={{ 
                  padding: 16, 
                  marginBottom: 12, 
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: 8 }}>
                  {company.name}
                </div>
                <div style={{ color: '#666', fontSize: '0.9em' }}>
                  {company.dot_number && <span>DOT: {company.dot_number}</span>}
                  {company.dot_number && company.mc_number && <span> • </span>}
                  {company.mc_number && <span>MC: {company.mc_number}</span>}
                  {company.type && (
                    <>
                      {(company.dot_number || company.mc_number) && <span> • </span>}
                      <span>Type: {company.type}</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <details style={{ marginTop: 32 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: 8 }}>
              Raw JSON Data
            </summary>
            <pre style={{ 
              padding: 16, 
              backgroundColor: '#f9f9f9', 
              borderRadius: 4,
              overflow: 'auto',
              fontSize: '0.85em'
            }}>
              {JSON.stringify({ data, error }, null, 2)}
            </pre>
          </details>
        </>
      )}

      {!data && !error && (
        <p>No data available.</p>
      )}
    </div>
  );
}

