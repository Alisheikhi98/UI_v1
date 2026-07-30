import type { School, SchoolFormData } from "@/lib/api/schools-store";

export interface SchoolPersistenceAdapter {
  getAll(): Promise<School[]>;
  getById(id: number): Promise<School | null>;
  create(data: SchoolFormData): Promise<School>;
  update(id: number, data: SchoolFormData): Promise<School>;
  delete(id: number): Promise<void>;
}

export class SchoolRepository {
  private readonly persistence: SchoolPersistenceAdapter;

  constructor(persistence: SchoolPersistenceAdapter) {
    this.persistence = persistence;
  }

  getAll(): Promise<School[]> {
    return this.persistence.getAll();
  }

  getById(id: number): Promise<School | null> {
    return this.persistence.getById(id);
  }

  create(data: SchoolFormData): Promise<School> {
    return this.persistence.create(data);
  }

  update(id: number, data: SchoolFormData): Promise<School> {
    return this.persistence.update(id, data);
  }

  delete(id: number): Promise<void> {
    return this.persistence.delete(id);
  }
}
