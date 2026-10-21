// Mesmo algoritmo de jota_integrador/src/contadores/dominio/contador.ts -- só pra
// sinalização visual cedo (quem decide de verdade é o backend). Contador pode ser
// escritório (CNPJ) ou pessoa física autônoma (CPF), por isso o dispatch pelo tamanho.
function validarCpf(cpf) {
  const digitos = (cpf ?? '').replace(/\D/g, '');
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigitoVerificador = (base, pesoInicial) => {
    const soma = base.split('').reduce((acumulado, digito, indice) => acumulado + Number(digito) * (pesoInicial - indice), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const base = digitos.slice(0, 9);
  const digito1 = calcularDigitoVerificador(base, 10);
  const digito2 = calcularDigitoVerificador(base + digito1, 11);

  return digitos === `${base}${digito1}${digito2}`;
}

function validarCnpj(cnpj) {
  const digitos = (cnpj ?? '').replace(/\D/g, '');
  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const calcularDigitoVerificador = (base, pesos) => {
    const soma = base.split('').reduce((acumulado, digito, indice) => acumulado + Number(digito) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesosPrimeiroDigito = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosSegundoDigito = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const base = digitos.slice(0, 12);
  const digito1 = calcularDigitoVerificador(base, pesosPrimeiroDigito);
  const digito2 = calcularDigitoVerificador(base + digito1, pesosSegundoDigito);

  return digitos === `${base}${digito1}${digito2}`;
}

export function validarCpfOuCnpj(valor) {
  const digitos = (valor ?? '').replace(/\D/g, '');
  if (digitos.length === 11) return validarCpf(digitos);
  if (digitos.length === 14) return validarCnpj(digitos);
  return false;
}
