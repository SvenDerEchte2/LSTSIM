// auth.js - Zentraler Supabase Auth Schutz
(async function() {
  const SUPABASE_URL = 'https://kvbeogaiijppblhaoqyc.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YmVvZ2FpaWpwcGJsaGFvcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTI4NTMsImV4cCI6MjEwMzY4ODg1M30.cPz9RJ3pqtS91UE1wuj-1i0UiCR5iSmjVELDnYjcx-0';

  // Supabase Skript dynamisch laden, falls noch nicht geschehen
  if (!window.supabase) {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  const authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    window.location.replace("login.html");
  }
})();