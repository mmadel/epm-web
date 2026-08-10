import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ConsoleLayout } from './layout/console-layout';

/**
 * The application root.
 *
 * It mounts the frame and puts the router's outlet inside it, and does nothing
 * else: everything the frame knows - the environment, who is signed in, where
 * home is - is the layout's business, and everything on a screen is the routed
 * component's.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConsoleLayout],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
