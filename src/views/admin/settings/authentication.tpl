<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
			<form role="form" class="authentication-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">[[admin/settings/authentication:jwt-settings]]</h5>

					<div class="mb-3">
						<div class="form-check form-switch">
							<input type="checkbox" class="form-check-input" id="jwt:enabled" name="jwt:enabled" {{{ if jwt:enabled }}}checked{{{ end }}} />
							<label for="jwt:enabled" class="form-check-label">[[admin/settings/authentication:jwt-enabled]]</label>
						</div>
						<p class="form-text">[[admin/settings/authentication:jwt-enabled-help]]</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="jwt:tokenExpiry">[[admin/settings/authentication:jwt-token-expiry]]</label>
						<input type="number" id="jwt:tokenExpiry" name="jwt:tokenExpiry" title="[[admin/settings/authentication:jwt-token-expiry]]" class="form-control" placeholder="1200" value="{jwt:tokenExpiry}" />
						<p class="form-text">[[admin/settings/authentication:jwt-token-expiry-help]]</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="jwt:rememberTokenExpiry">[[admin/settings/authentication:jwt-remember-token-expiry]]</label>
						<input type="number" id="jwt:rememberTokenExpiry" name="jwt:rememberTokenExpiry" title="[[admin/settings/authentication:jwt-remember-token-expiry]]" class="form-control" placeholder="14" value="{jwt:rememberTokenExpiry}" />
						<p class="form-text">[[admin/settings/authentication:jwt-remember-token-expiry-help]]</p>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">[[admin/settings/authentication:session-settings]]</h5>

					<div class="mb-3">
						<div class="form-check form-switch">
							<input type="checkbox" class="form-check-input" id="session:enabled" name="session:enabled" {{{ if session:enabled }}}checked{{{ end }}} />
							<label for="session:enabled" class="form-check-label">[[admin/settings/authentication:session-enabled]]</label>
						</div>
						<p class="form-text">[[admin/settings/authentication:session-enabled-help]]</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="sessionDuration">[[admin/settings/authentication:session-duration]]</label>
						<input type="number" id="sessionDuration" name="sessionDuration" title="[[admin/settings/authentication:session-duration]]" class="form-control" placeholder="1200" value="{sessionDuration}" />
						<p class="form-text">[[admin/settings/authentication:session-duration-help]]</p>
					</div>

					<div class="mb-3">
						<label class="form-label" for="loginDays">[[admin/settings/authentication:login-days]]</label>
						<input type="number" id="loginDays" name="loginDays" title="[[admin/settings/authentication:login-days]]" class="form-control" placeholder="14" value="{loginDays}" />
						<p class="form-text">[[admin/settings/authentication:login-days-help]]</p>
					</div>
				</div>

				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">[[admin/settings/authentication:migration-info]]</h5>
					<div class="alert alert-info">
						<p>[[admin/settings/authentication:migration-info-text]]</p>
						<ul>
							<li>[[admin/settings/authentication:migration-info-step1]]</li>
							<li>[[admin/settings/authentication:migration-info-step2]]</li>
							<li>[[admin/settings/authentication:migration-info-step3]]</li>
						</ul>
					</div>
				</div>
			</form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div> 