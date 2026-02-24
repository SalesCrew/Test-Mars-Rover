const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const wochenCheckService = {
  async isWeekConfirmed(glId: string, weekStartDate: string): Promise<boolean> {
    const res = await fetch(
      `${API_BASE_URL}/wochen-check/${glId}?week_start_date=${weekStartDate}`
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.confirmed === true;
  },

  async confirmWeek(glId: string, weekStartDate: string): Promise<void> {
    await fetch(`${API_BASE_URL}/wochen-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gebietsleiter_id: glId, week_start_date: weekStartDate }),
    });
  },
};
