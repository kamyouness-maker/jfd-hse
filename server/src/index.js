const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tourRoutes = require('./routes/tours');
const checklistRoutes = require('./routes/checklist');
const photoRoutes = require('./routes/photos');
const syncRoutes = require('./routes/sync');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api', checklistRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.listen(PORT, () => {
  console.log(`SafeCheck OCP Server running on port ${PORT}`);
});

module.exports = app;
