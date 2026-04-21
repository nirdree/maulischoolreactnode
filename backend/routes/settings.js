// routes/settings.js
const express = require('express');
const router  = express.Router();
const { SchoolSettings } = require('../models/Others');
const r       = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/settings ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) settings = await SchoolSettings.create({});
    r.ok(res, settings);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/settings ────────────────────────────────────────
router.put('/', authorize('admin'), async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) {
      settings = await SchoolSettings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    r.ok(res, settings, 'Settings saved');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;