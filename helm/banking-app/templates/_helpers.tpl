{{/*
  Expand the name of the chart.
*/}}
{{- define "banking.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
  Create a full name: release-chart, truncated to 63 chars.
*/}}
{{- define "banking.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
  Common labels applied to every resource.
*/}}
{{- define "banking.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
  Selector labels for a specific service.
  Usage: {{ include "banking.selectorLabels" (dict "name" "auth-service") }}
*/}}
{{- define "banking.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/part-of: banking-platform
{{- end }}

{{/*
  Build the full ECR image reference for a service.
  Usage: {{ include "banking.image" (dict "global" .Values.global "name" "auth-service") }}
*/}}
{{- define "banking.image" -}}
{{- printf "%s/banking/%s:%s" .global.registry .name .global.imageTag }}
{{- end }}

{{/*
  Standard OTel environment variables block (injected into every service container).
*/}}
{{- define "banking.otelEnv" -}}
- name: OTEL_EXPORTER_OTLP_ENDPOINT
  value: {{ .Values.global.otel.endpoint | quote }}
- name: OTEL_EXPORTER_OTLP_PROTOCOL
  value: "http/protobuf"
- name: OTEL_RESOURCE_ATTRIBUTES
  value: "service.version={{ .Chart.AppVersion }},deployment.environment={{ .Values.global.namespace }}"
{{- end }}

{{/*
  Standard database + cache environment variables.
*/}}
{{- define "banking.dbEnv" -}}
- name: DB_HOST
  value: {{ .Values.global.postgres.host | quote }}
- name: DB_PORT
  value: {{ .Values.global.postgres.port | quote }}
- name: DB_NAME
  value: {{ .Values.global.postgres.database | quote }}
- name: DB_USER
  value: {{ .Values.global.postgres.user | quote }}
- name: DB_PASS
  valueFrom:
    secretKeyRef:
      name: banking-secrets
      key: postgres-password
- name: REDIS_HOST
  value: {{ .Values.global.redis.host | quote }}
- name: REDIS_PORT
  value: {{ .Values.global.redis.port | quote }}
- name: KAFKA_BROKERS
  value: {{ .Values.global.kafka.brokers | quote }}
{{- end }}

{{/*
  Standard Prometheus scrape annotations.
  Usage: {{ include "banking.promAnnotations" (dict "port" "4001") }}
*/}}
{{- define "banking.promAnnotations" -}}
prometheus.io/scrape: "true"
prometheus.io/path: "/metrics"
prometheus.io/port: {{ .port | quote }}
{{- end }}

{{/*
  Standard pod anti-affinity: prefer spreading across nodes/AZs.
  Usage: {{ include "banking.antiAffinity" (dict "name" "auth-service") }}
*/}}
{{- define "banking.antiAffinity" -}}
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: {{ .name }}
          topologyKey: kubernetes.io/hostname
      - weight: 50
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: {{ .name }}
          topologyKey: topology.kubernetes.io/zone
{{- end }}

{{/*
  Standard readiness + liveness probes for NestJS services (GET /health).
*/}}
{{- define "banking.probes" -}}
readinessProbe:
  httpGet:
    path: /health
    port: {{ .port }}
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3
livenessProbe:
  httpGet:
    path: /health
    port: {{ .port }}
  initialDelaySeconds: 30
  periodSeconds: 20
  failureThreshold: 3
{{- end }}
