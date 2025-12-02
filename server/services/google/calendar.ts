/**
 * Serviço de integração com Google Calendar
 * Permite criar, atualizar e deletar eventos no calendário do usuário
 */
import { calendar_v3 } from '@googleapis/calendar';
import { OAuth2Client } from 'google-auth-library';
import { getAuthenticatedClient } from './oauth.js';

// Timezone padrão (Brasil)
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export interface CalendarEventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  meetingUrl?: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
}

/**
 * Cria um cliente do Google Calendar
 */
function createCalendarClient(oauth2Client: OAuth2Client): calendar_v3.Calendar {
  return new calendar_v3.Calendar({ auth: oauth2Client });
}

/**
 * Cria um evento no Google Calendar
 */
export async function createCalendarEvent(
  userId: string,
  eventData: CalendarEventData
): Promise<CalendarEventResult | null> {
  const oauth2Client = await getAuthenticatedClient(userId);

  if (!oauth2Client) {
    console.warn(`[CALENDAR] Usuário ${userId} não está conectado ao Google`);
    return null;
  }

  try {
    const calendar = createCalendarClient(oauth2Client);

    const event: calendar_v3.Schema$Event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      location: eventData.location,
      attendees: eventData.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24h antes
          { method: 'email', minutes: 60 },       // 1h antes
          { method: 'popup', minutes: 10 },       // 10min antes
        ],
      },
    };

    // Adiciona link de reunião se fornecido
    if (eventData.meetingUrl) {
      event.conferenceData = {
        entryPoints: [{
          entryPointType: 'video',
          uri: eventData.meetingUrl,
          label: 'Participar da reunião',
        }],
      };
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Envia convites para participantes
    });

    console.log(`[CALENDAR] Evento criado: ${response.data.id}`);

    return {
      eventId: response.data.id || '',
      htmlLink: response.data.htmlLink || '',
    };
  } catch (error) {
    console.error('[CALENDAR] Erro ao criar evento:', error);
    return null;
  }
}

/**
 * Atualiza um evento existente no Google Calendar
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  eventData: Partial<CalendarEventData>
): Promise<boolean> {
  const oauth2Client = await getAuthenticatedClient(userId);

  if (!oauth2Client) {
    console.warn(`[CALENDAR] Usuário ${userId} não está conectado ao Google`);
    return false;
  }

  try {
    const calendar = createCalendarClient(oauth2Client);

    const updateData: calendar_v3.Schema$Event = {};

    if (eventData.title) {
      updateData.summary = eventData.title;
    }

    if (eventData.description !== undefined) {
      updateData.description = eventData.description;
    }

    if (eventData.startTime) {
      updateData.start = {
        dateTime: eventData.startTime.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      };
    }

    if (eventData.endTime) {
      updateData.end = {
        dateTime: eventData.endTime.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      };
    }

    if (eventData.location !== undefined) {
      updateData.location = eventData.location;
    }

    if (eventData.attendees) {
      updateData.attendees = eventData.attendees.map(email => ({ email }));
    }

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: updateData,
      sendUpdates: 'all',
    });

    console.log(`[CALENDAR] Evento atualizado: ${eventId}`);
    return true;
  } catch (error) {
    console.error('[CALENDAR] Erro ao atualizar evento:', error);
    return false;
  }
}

/**
 * Deleta/cancela um evento no Google Calendar
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const oauth2Client = await getAuthenticatedClient(userId);

  if (!oauth2Client) {
    console.warn(`[CALENDAR] Usuário ${userId} não está conectado ao Google`);
    return false;
  }

  try {
    const calendar = createCalendarClient(oauth2Client);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all', // Notifica participantes sobre cancelamento
    });

    console.log(`[CALENDAR] Evento deletado: ${eventId}`);
    return true;
  } catch (error) {
    console.error('[CALENDAR] Erro ao deletar evento:', error);
    return false;
  }
}

/**
 * Obtém detalhes de um evento
 */
export async function getCalendarEvent(
  userId: string,
  eventId: string
): Promise<calendar_v3.Schema$Event | null> {
  const oauth2Client = await getAuthenticatedClient(userId);

  if (!oauth2Client) {
    return null;
  }

  try {
    const calendar = createCalendarClient(oauth2Client);

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    return response.data;
  } catch (error) {
    console.error('[CALENDAR] Erro ao obter evento:', error);
    return null;
  }
}

/**
 * Lista eventos em um período
 */
export async function listCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date,
  maxResults: number = 50
): Promise<calendar_v3.Schema$Event[]> {
  const oauth2Client = await getAuthenticatedClient(userId);

  if (!oauth2Client) {
    return [];
  }

  try {
    const calendar = createCalendarClient(oauth2Client);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('[CALENDAR] Erro ao listar eventos:', error);
    return [];
  }
}

/**
 * Verifica disponibilidade em um período
 * Retorna slots ocupados
 */
export async function checkAvailability(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date; title: string }>> {
  const events = await listCalendarEvents(userId, startDate, endDate);

  return events
    .filter(event => event.start?.dateTime && event.end?.dateTime)
    .map(event => ({
      start: new Date(event.start!.dateTime!),
      end: new Date(event.end!.dateTime!),
      title: event.summary || 'Ocupado',
    }));
}

/**
 * Cria um evento com Google Meet
 */
export async function createCalendarEventWithMeet(
  userId: string,
  eventData: Omit<CalendarEventData, 'meetingUrl'>
): Promise<(CalendarEventResult & { meetUrl?: string }) | null> {
  const oauth2Client = await getAuthenticatedClient(userId);

  if (!oauth2Client) {
    console.warn(`[CALENDAR] Usuário ${userId} não está conectado ao Google`);
    return null;
  }

  try {
    const calendar = createCalendarClient(oauth2Client);

    const event: calendar_v3.Schema$Event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      location: eventData.location,
      attendees: eventData.attendees?.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const meetUrl = response.data.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri;

    console.log(`[CALENDAR] Evento com Meet criado: ${response.data.id}`);

    return {
      eventId: response.data.id || '',
      htmlLink: response.data.htmlLink || '',
      meetUrl: meetUrl || undefined,
    };
  } catch (error) {
    console.error('[CALENDAR] Erro ao criar evento com Meet:', error);
    return null;
  }
}
