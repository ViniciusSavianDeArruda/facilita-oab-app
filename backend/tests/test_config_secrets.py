import os

os.environ.setdefault("ENV", "test")

import subprocess
import sys
import unittest
from pathlib import Path

from app.config import problemas_de_segredos

FORTE_JWT = "k8Zp2vQ9xLw4TnR7bYc1HdE6sUa3MfG0jXoV5iNt"
FORTE_SENHA = "Zq7!mP2#vK9wL"
BACKEND = Path(__file__).resolve().parent.parent


class ProblemasDeSegredosTests(unittest.TestCase):
	def test_segredos_fortes_em_producao_passam(self):
		self.assertEqual(problemas_de_segredos("production", FORTE_JWT, FORTE_SENHA), [])

	def test_dev_e_test_nao_sao_validados(self):
		for env in ("dev", "test", "DEV"):
			self.assertEqual(problemas_de_segredos(env, "x", ""), [])

	def test_vazio_curto_e_placeholder_sao_rejeitados_em_producao(self):
		casos = [
			("", FORTE_SENHA, "JWT_SECRET"),
			("   ", FORTE_SENHA, "JWT_SECRET"),
			("curto", FORTE_SENHA, "JWT_SECRET"),
			("a" * 40, FORTE_SENHA, "JWT_SECRET"),
			("troque_isso_por_um_segredo_aleatorio", FORTE_SENHA, "JWT_SECRET"),
			(FORTE_JWT, "", "APP_PASSWORD"),
			(FORTE_JWT, "troque_isso_por_uma_senha_forte", "APP_PASSWORD"),
			(FORTE_JWT, "changeme", "APP_PASSWORD"),
			(FORTE_JWT, "curta", "APP_PASSWORD"),
		]
		for jwt_secret, senha, esperado in casos:
			with self.subTest(jwt_secret=len(jwt_secret), senha=len(senha)):
				problemas = problemas_de_segredos("production", jwt_secret, senha)
				self.assertTrue(any(p.startswith(esperado) for p in problemas))

	def test_mensagens_nao_contem_o_valor(self):
		segredo = "segredo-curto-123"
		problemas = problemas_de_segredos("production", segredo, FORTE_SENHA)
		self.assertTrue(problemas)
		self.assertNotIn(segredo, " ".join(problemas))

	def test_env_desconhecido_e_tratado_como_producao(self):
		self.assertTrue(problemas_de_segredos("prod", "curto", FORTE_SENHA))


class InicializacaoTests(unittest.TestCase):
	def _importar_config(self, env, jwt_secret, senha):
		ambiente = {
			**os.environ,
			"ENV": env,
			"JWT_SECRET": jwt_secret,
			"APP_PASSWORD": senha,
			"GEMINI_API_KEY": "ci-dummy-key",
			"DATABASE_URL": "sqlite:///:memory:",
		}
		return subprocess.run(
			[sys.executable, "-c", "import app.config"],
			cwd=BACKEND,
			env=ambiente,
			capture_output=True,
			text=True,
		)

	def test_producao_com_segredo_fraco_nao_inicia_e_nao_vaza_valor(self):
		fraco = "valor-fraco-unico-987"
		resultado = self._importar_config("production", fraco, FORTE_SENHA)
		self.assertNotEqual(resultado.returncode, 0)
		saida = resultado.stdout + resultado.stderr
		self.assertIn("JWT_SECRET", saida)
		self.assertNotIn(fraco, saida)

	def test_producao_com_segredos_fortes_inicia(self):
		resultado = self._importar_config("production", FORTE_JWT, FORTE_SENHA)
		self.assertEqual(resultado.returncode, 0, resultado.stderr)


if __name__ == "__main__":
	unittest.main()
