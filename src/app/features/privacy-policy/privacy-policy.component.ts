import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeploymentConfigService } from '../../core/services/deployment-config.service';

/**
 * Static privacy policy for a self-hosted PostyFox instance.
 *
 * PostyFox is self-hosted software: there is no central PostyFox operator collecting data
 * across deployments. This page documents what the *software itself* stores and transmits so
 * that whoever runs an instance can publish it as-is or adapt the operator identity and contact
 * address to their deployment (see DeploymentConfigService — set via the `OPERATOR_NAME` /
 * `OPERATOR_CONTACT` environment variables). Until those are configured, bracketed placeholders
 * are shown along with a note directing operators to configure them.
 */
@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink],
  templateUrl: './privacy-policy.component.html',
})
export class PrivacyPolicyComponent {
  private deploymentConfig = inject(DeploymentConfigService);

  readonly lastUpdated = 'August 2026';

  readonly operatorName = this.deploymentConfig.operatorName;
  readonly operatorContact = this.deploymentConfig.operatorContact;
  readonly isConfigured = this.deploymentConfig.isConfigured;
}
