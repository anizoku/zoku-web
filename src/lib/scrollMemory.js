// Armazena posições de scroll por pathname (em memória, durante a sessão).
// Usado pelo <ScrollMemory /> para restaurar a posição ao voltar de páginas de detalhe.
// O botão "Início" chama requestReset() para um reset intencional (limpa tudo).
const positions = new Map();
let resetRequested = false;

export const scrollMemory = {
  get(path) {
    return positions.has(path) ? positions.get(path) : null;
  },
  set(path, y) {
    positions.set(path, y);
  },
  // Marca um reset intencional (ex: clique em "Início").
  requestReset() {
    resetRequested = true;
  },
  isResetRequested() {
    return resetRequested;
  },
  // Consome o pedido de reset: limpa tudo e retorna true se havia pedido.
  consumeReset() {
    if (resetRequested) {
      resetRequested = false;
      positions.clear();
      return true;
    }
    return false;
  },
};