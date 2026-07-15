import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';

function mapService(row: Record<string, unknown>) {
  return {
    id:           row.id,
    name:         row.name,
    description:  row.description ?? '',
    price:        parseFloat(String(row.price)) || 0,
    durationMins: Number(row.duration_minutes) || 30,
    isActive:     row.is_active ?? true,
  };
}

export const servicesController = {
  /** GET /services/me — the authenticated barber's own services. */
  async getMine(req: Request, res: Response) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('barber_id', req.user!.sub)
      .order('created_at', { ascending: true });
    if (error) { sendError(res, 'Failed to load services.', 500); return; }
    sendSuccess(res, (data ?? []).map(mapService));
  },

  /** POST /services */
  async create(req: Request, res: Response) {
    const { name, description, price, durationMins } = req.body as {
      name?: string; description?: string; price?: number; durationMins?: number;
    };
    if (!name?.trim() || price == null) {
      sendError(res, 'Service name and price are required.');
      return;
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('services')
      .insert({
        barber_id: req.user!.sub,
        name: name.trim(),
        description: description ?? null,
        price,
        duration_minutes: durationMins ?? 30,
      })
      .select()
      .single();
    if (error || !data) { sendError(res, 'Failed to create service.', 500); return; }
    sendSuccess(res, mapService(data), 'Service created.', 201);
  },

  /** PUT /services/:id */
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, description, price, durationMins, isActive } = req.body as {
      name?: string; description?: string; price?: number; durationMins?: number; isActive?: boolean;
    };
    const patch: Record<string, unknown> = {};
    if (name !== undefined)         patch.name = name.trim();
    if (description !== undefined)  patch.description = description ?? null;
    if (price !== undefined)        patch.price = price;
    if (durationMins !== undefined) patch.duration_minutes = durationMins;
    if (isActive !== undefined)     patch.is_active = isActive;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('services')
      .update(patch)
      .eq('id', id)
      .eq('barber_id', req.user!.sub) // scope to owner
      .select()
      .single();
    if (error || !data) { sendError(res, 'Failed to update service.', 500); return; }
    sendSuccess(res, mapService(data), 'Service updated.');
  },

  /** DELETE /services/:id */
  async remove(req: Request, res: Response) {
    const { id } = req.params;
    const supabase = getSupabase();
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('barber_id', req.user!.sub);
    if (error) { sendError(res, 'Failed to delete service.', 500); return; }
    sendSuccess(res, null, 'Service deleted.');
  },
};
