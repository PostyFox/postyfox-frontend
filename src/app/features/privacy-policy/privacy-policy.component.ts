import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Static privacy policy for a self-hosted PostyFox instance.
 *
 * PostyFox is self-hosted software: there is no central PostyFox operator collecting data
 * across deployments. This page documents what the *software itself* stores and transmits so
 * that whoever runs an instance can publish it as-is or adapt the bracketed placeholders
 * (operator identity, contact address, retention specifics) to their deployment.
 */
@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink],
  templateUrl: './privacy-policy.component.html',
})
export class PrivacyPolicyComponent {
  readonly lastUpdated = 'August 2026';
}
