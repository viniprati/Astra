# AstraBot

Bot de parcerias, blacklist, contador, ranking e painel administrativo para
Discord.

## Reference

AstraBot uses the HatsuTech repository as a project and licensing reference:

- HatsuTech: https://github.com/viniprati/HatsuTech

Because AstraBot and HatsuTech are owned/authored by Vinicius Prati Machado,
the use of HatsuTech as inspiration and licensing reference is expressly
authorized by the same rights holder.

The AstraBot source-available license was adapted from the HatsuTech
source-available license, with project-specific terms changed for AstraBot.

## License

This repository is source-available for reading and review only.

It is not released under an open-source license. Use, copying, modification,
hosting, redistribution or derivative works require prior written authorization
from Vinicius Prati Machado.

See [LICENSE](./LICENSE) for the complete terms.

## Operacao

Configure `.env` com `DISCORD_TOKEN` e `MONGO_URI`. `MONGO_TOKEN` ainda
funciona como fallback legado, mas `MONGO_URI` e o nome mais claro para
producao.

Comandos uteis:

- `npm start`: inicia um processo unico.
- `npm run shard`: inicia com `ShardingManager`.
- `npm run deploy`: registra comandos slash manualmente.
- `npm run check`: valida a sintaxe dos arquivos JavaScript.

Para producao, configure `REDIS_URL` quando usar mais de um processo ou shard.
Sem Redis, cooldowns e rascunhos de parceria ficam em memoria local do processo.

Se `HEALTH_PORT` estiver definido, o bot expõe:

- `/livez`: processo vivo.
- `/readyz` e `/healthz`: Discord pronto e Mongo respondendo.
- `/metrics`: metricas Prometheus.

Em sharding, a porta de health e deslocada por shard: `HEALTH_PORT + shardId`.

Metricas principais:

- `astra_command_total` e `astra_command_duration_seconds`: uso e latencia por comando.
- `astra_interaction_total` e `astra_interaction_duration_seconds`: uso e latencia por tipo de interacao.
- `astra_http_request_total` e `astra_http_request_duration_seconds`: uso e latencia dos endpoints de health/metrics.
- `astra_partnership_total`: funil de parcerias, incluindo bloqueios, previews, cancelamentos e envios.
- `astra_blacklist_checks_total`: checagens livres ou bloqueadas.
- `astra_cache_total`: hits, misses e operacoes de cache.
- `astra_discord_ready`, `astra_discord_ws_ping_ms` e `astra_guild_count`: estado do gateway.
- `astra_cached_user_count`, `astra_cached_channel_count` e `astra_command_definition_count`: tamanho do processo.
- `astra_mongo_ping_duration_seconds`: latencia do Mongo observada pelo health check.

## PostHog

O bot pode enviar eventos de produto para o PostHog sem expor IDs crus do
Discord. IDs de usuario, servidor e canal são enviados como hash HMAC.

Variaveis opcionais:

- `POSTHOG_ENABLED=true`
- `POSTHOG_KEY`: project API key do PostHog para captura.
- `POSTHOG_HOST`: endpoint de captura, por exemplo `https://us.i.posthog.com`.
- `POSTHOG_SALT`: segredo usado para gerar hashes estaveis.
- `POSTHOG_TIMEOUT_MS`: timeout do envio, padrao `3000`.

Eventos enviados:

- `bot_started`
- `guild_joined`
- `guild_left`
- `command_executed`
- `command_rate_limited`
- `partnership_modal_opened`
- `partnership_preview_created`
- `partnership_sent`
- `partnership_blocked`
- `partnership_canceled`
- `partnership_invalid_link`
- `partnership_invalid_color`
- `blacklist_item_added`
- `blacklist_item_removed`
- `blacklist_checked`
- `config_updated`
- `sync_completed`
- `bot_error`
