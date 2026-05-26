import { User, Project, ActivityLog } from '../types';

// Mocking a Supabase-like client interface
class SupabaseMock {
  private currentUser: User | null = null;

  async signIn(email: string): Promise<{ user: User | null; error: Error | null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email.includes('error')) {
          resolve({ user: null, error: new Error('Invalid credentials') });
        } else {
          this.currentUser = {
            id: 'usr_' + Math.random().toString(36).substr(2, 9),
            email,
            name: email.split('@')[0],
            created_at: new Date().toISOString(),
          };
          resolve({ user: this.currentUser, error: null });
        }
      }, 800);
    });
  }

  async signOut(): Promise<{ error: Error | null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null;
        resolve({ error: null });
      }, 400);
    });
  }

  async getSession(): Promise<{ user: User | null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ user: this.currentUser });
      }, 200);
    });
  }

  async getProjects(): Promise<{ data: Project[] | null; error: Error | null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: [
            { id: 'proj_1', name: 'Alpha API', status: 'active', created_at: '2024-01-15T10:00:00Z' },
            { id: 'proj_2', name: 'Beta Dashboard', status: 'building', created_at: '2024-03-20T14:30:00Z' },
            { id: 'proj_3', name: 'Legacy System', status: 'archived', created_at: '2023-11-05T09:15:00Z' },
          ],
          error: null,
        });
      }, 600);
    });
  }
  
  async getActivity(): Promise<{ data: ActivityLog[] | null; error: Error | null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: [
            { id: 'act_1', action: 'Deployed Alpha API to production', timestamp: new Date(Date.now() - 3600000).toISOString(), user_id: 'usr_1' },
            { id: 'act_2', action: 'Updated billing settings', timestamp: new Date(Date.now() - 86400000).toISOString(), user_id: 'usr_1' },
            { id: 'act_3', action: 'Invited team member', timestamp: new Date(Date.now() - 172800000).toISOString(), user_id: 'usr_1' },
          ],
          error: null,
        });
      }, 500);
    });
  }
}

export const supabase = new SupabaseMock();
