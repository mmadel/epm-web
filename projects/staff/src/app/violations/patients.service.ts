// Deliberate violations - scratch branch only, proving the F-00 gate is real.
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Violation 2: staff reaching into the patient application.
import { App } from '../../../../patient/src/app/app';

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private readonly http = inject(HttpClient);

  readonly peer: typeof App | undefined = undefined;

  list() {
    // Violation 1: relative API URL.
    return this.http.get('/api/patients');
  }
}
