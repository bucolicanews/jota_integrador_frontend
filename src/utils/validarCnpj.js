// Mesmo algoritmo (dígitos verificadores) de jota_integrador/src/empresas/dominio/empresa.ts
// -- só pra sinalização visual cedo (quem decide de verdade é o backend).
export function validarCnpj(cnpj) {
  const digitos = (cnpj ?? '').replace(/\D/g, '');

  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false; // todos os dígitos iguais -- nunca válido, embora passe no checksum

  const calcularDigitoVerificador = (base, pesos) => {
    const soma = base.split('').reduce((acumulado, digito, indice) => acumulado + Number(digito) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesosPrimeiroDigito = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosSegundoDigito = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digito1 = calcularDigitoVerificador(digitos.slice(0, 12), pesosPrimeiroDigito);
  const digito2 = calcularDigitoVerificador(digitos.slice(0, 12) + digito1, pesosSegundoDigito);

  return digitos.slice(12) === `${digito1}${digito2}`;
}
