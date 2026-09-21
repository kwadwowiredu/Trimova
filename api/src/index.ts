import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import barberRoutes from './routes/barbers';
import uploadRoutes from './routes/uploads';
import servicesRoutes from './routes/services';
import workingHoursRoutes from './routes/workingHours';
import staffRoutes from './routes/staff';
import bookingRoutes from './routes/bookings';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import reviewRoutes from './routes/reviews';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(cors({ origin: '*' }));
// Paystack signs the RAW webhook body, so keep a copy before parsing reshapes it.
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/working-hours', workingHoursRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Trimova API running on http://localhost:${PORT}`);
});

export default app;
