import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { ScanService } from '../services/scanService';
import { z } from 'zod';

const router = Router();
const scanService = new ScanService();

const searchSchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
  location: z.string().optional(),
});

// Start a new search
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { query, category, location } = searchSchema.parse(req.body);

    const searchId = await scanService.startScan(
      req.userId!,
      query,
      category,
      location
    );

    res.json({
      searchId,
      message: 'Search started',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Search error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Get search status
router.get('/:searchId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const search = await scanService.getScanStatus(req.params.searchId, req.userId!);
    res.json(search);
  } catch (error) {
    console.error('Get search error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Get all searches for user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const searches = await scanService.getUserSearches(req.userId!);
    res.json(searches);
  } catch (error) {
    console.error('Get searches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leads for a search
router.get('/:searchId/leads', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const leads = await scanService.getSearchLeads(req.params.searchId, req.userId!);
    res.json(leads);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export default router;
