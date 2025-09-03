import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertAppointmentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClientsWithDetails();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClientWithDetails(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const updates = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, updates);
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete client" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsWithDetails();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/upcoming", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const appointments = await storage.getUpcomingAppointments(limit);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming appointments" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(400).json({ error: "Invalid appointment data" });
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const updates = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, updates);
      res.json(appointment);
    } catch (error) {
      res.status(400).json({ error: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete appointment" });
    }
  });

  // Onboarding routes
  app.get("/api/clients/:id/onboarding", async (req, res) => {
    try {
      const stages = await storage.getOnboardingStages(req.params.id);
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding stages" });
    }
  });

  app.put("/api/onboarding/:id", async (req, res) => {
    try {
      const updates = req.body;
      const stage = await storage.updateOnboardingStage(req.params.id, updates);
      res.json(stage);
    } catch (error) {
      res.status(400).json({ error: "Failed to update onboarding stage" });
    }
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (clientId) {
        const activities = await storage.getActivities(clientId);
        res.json(activities);
      } else {
        const activities = await storage.getRecentActivities(limit);
        res.json(activities);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Integration routes
  app.get("/api/integrations", async (req, res) => {
    try {
      const integrations = await storage.getIntegrations();
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
