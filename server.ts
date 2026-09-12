import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { engine } from './server/engine';
import { KSPCB_CAAQMS_STATIONS } from './server/data';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Get all registered facilities
  app.get('/api/facilities', (req, res) => {
    try {
      const facilities = engine.getFacilities();
      res.json({ facilities });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch facilities' });
    }
  });

  // Get KSPCB CAAQMS monitoring stations & CSTEP emission inventory summary
  app.get('/api/caaqms', (req, res) => {
    try {
      res.json({
        stations: KSPCB_CAAQMS_STATIONS,
        cstep_benchmarks: {
          air_shed_size: '60 km x 60 km',
          bbmp_pm10_load_2019: '24,600 tonnes/year',
          bbmp_pm25_load_2019: '14,700 tonnes/year',
          top_sources_pm10: 'Road & Soil Dust (51%), Transport (19%), Construction (6%), Secondary (8%)',
          top_sources_pm25: 'Transport (40%), Soil & Road Dust (25%), Secondary Sulphates/Nitrates (16%)',
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch CAAQMS data' });
    }
  });

  // Simulate IoT sensor reading on a facility
  app.post('/api/facilities/sensor', (req, res) => {
    try {
      const { facilityId, moisture_pct, contamination_flag } = req.body;
      if (!facilityId) {
        return res.status(400).json({ error: 'facilityId is required' });
      }
      const updated = engine.applySensorReading(facilityId, {
        moisture_pct: Number(moisture_pct) || 0,
        contamination_flag: Boolean(contamination_flag),
      });
      if (!updated) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      res.json({ facility: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to apply sensor reading' });
    }
  });

  // Describe facility situation via Gemini
  app.post('/api/facilities/:id/describe', async (req, res) => {
    try {
      const { id } = req.params;
      const description = await engine.describeFacility(id);
      res.json({ id, description });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to describe facility' });
    }
  });

  // Reset all facilities and ledger back to defaults
  app.post('/api/reset', (req, res) => {
    try {
      engine.reset();
      res.json({ success: true, facilities: engine.getFacilities() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to reset state' });
    }
  });

  // Run full multi-agent pipeline: Matchmaker -> Negotiation -> Regulatory -> Passport
  app.post('/api/pipeline/run', async (req, res) => {
    try {
      const results = await engine.runFullPipeline();
      const verification = engine.verifyLedger();
      res.json({
        results,
        verification,
        passports: engine.passports,
      });
    } catch (err: any) {
      console.error('Pipeline execution error:', err);
      res.status(500).json({ error: err?.message || 'Pipeline execution failed' });
    }
  });

  // Get current pipeline results
  app.get('/api/pipeline/results', (req, res) => {
    res.json({ results: engine.pipelineResults });
  });

  // Get ledger passports
  app.get('/api/ledger', (req, res) => {
    res.json({
      passports: engine.passports,
      verification: engine.verifyLedger(),
    });
  });

  // Verify chain integrity
  app.get('/api/ledger/verify', (req, res) => {
    res.json(engine.verifyLedger());
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
