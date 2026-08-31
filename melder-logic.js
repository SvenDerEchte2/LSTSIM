import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://kvbeogaiijppblhaoqyc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YmVvZ2FpaWpwcGJsaGFvcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTI4NTMsImV4cCI6MjEwMzY4ODg1M30.cPz9RJ3pqtS91UE1wuj-1i0UiCR5iSmjVELDnYjcx-0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sound = new Audio('meldeton.wav');

// === Realtime Listener für neue Einsätze ===
supabase
  .channel('einsaetze_channel')
  .on(
    'postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'einsaetze' }, 
    (payload) => {
      const einsatz = payload.new;
      const einsatzZeit = new Date(`${einsatz.datum}T${einsatz.uhrzeit}`);

      const displayPanel = document.getElementById('displayPanel');
      if (displayPanel) {
        displayPanel.style.backgroundColor = '#37b837ff'; // z.B. grün
      }
      document.getElementById('displayText1').textContent = einsatz.stichwort;
      document.getElementById('displayText2').textContent = einsatz.ort;
      document.getElementById('displayText3').textContent = einsatz.datum;
      document.getElementById('displayText4').textContent = einsatz.uhrzeit;      
      document.getElementById('bootImage').style.display = 'none';
      sound.currentTime = 0;
      sound.play().catch(err => console.error('Fehler beim Abspielen:', err));

      console.log('Neuer Einsatz (Realtime):', einsatz);
    }
  )
  .subscribe();

console.log('Realtime Listener aktiv!');
