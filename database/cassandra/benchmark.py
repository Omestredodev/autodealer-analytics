
import time
import statistics
from cassandra.cluster import Cluster


# Configuracoes do benchmark
HOST = "127.0.0.1"
PORT = 9042
EXECUCOES = 100


# Consultas utilizadas nos testes
CONSULTAS = {
    "Eventos por anuncio": """
        SELECT * FROM autodealer.events_by_advertisement
        WHERE advertisement_id = 11111111-1111-4111-8111-111111111111
        AND event_day = '2026-11-02'
        AND shard = 0
        LIMIT 100
    """,

    "Eventos por usuario": """
        SELECT * FROM autodealer.events_by_user
        WHERE user_id = 33333333-3333-4333-8333-333333333333
        AND event_day = '2026-11-02'
        AND shard = 0
        LIMIT 100
    """,

    "Eventos por veiculo": """
        SELECT * FROM autodealer.events_by_vehicle
        WHERE vehicle_id = 22222222-2222-4222-8222-222222222222
        AND event_day = '2026-11-02'
        AND shard = 0
        LIMIT 100
    """,

    "Eventos por tipo": """
        SELECT * FROM autodealer.events_by_type
        WHERE event_type = 'ADVERTISEMENT_VIEWED'
        AND event_day = '2026-11-02'
        AND shard = 0
        LIMIT 100
    """,

    "Eventos por periodo": """
        SELECT * FROM autodealer.events_by_period
        WHERE event_day = '2026-11-02'
        AND shard = 0
        LIMIT 100
    """
}


def executar_benchmark(session, nome, consulta):
    tempos = []

    # Aquecimento: primeira consulta fora da medicao
    session.execute(consulta)

    # Executa a consulta varias vezes
    for _ in range(EXECUCOES):
        inicio = time.perf_counter()

        session.execute(consulta)

        fim = time.perf_counter()

        tempo_ms = (fim - inicio) * 1000
        tempos.append(tempo_ms)

    # Calcula estatisticas
    print(f"\n{nome}")
    print(f"Media: {statistics.mean(tempos):.3f} ms")
    print(f"Mediana: {statistics.median(tempos):.3f} ms")
    print(f"Menor tempo: {min(tempos):.3f} ms")
    print(f"Maior tempo: {max(tempos):.3f} ms")


def main():
    cluster = Cluster([HOST], port=PORT)
    session = cluster.connect()

    try:
        print("INICIANDO BENCHMARK CASSANDRA")
        print(f"Quantidade de execucoes: {EXECUCOES}")

        for nome, consulta in CONSULTAS.items():
            executar_benchmark(session, nome, consulta)

        print("\nBENCHMARK FINALIZADO!")

    finally:
        session.shutdown()
        cluster.shutdown()


if __name__ == "__main__":
    main()
