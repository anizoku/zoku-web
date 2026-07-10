import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Sincroniza um valor escalar com um parâmetro da URL (query string).
 * - Leitura: valor vem do searchParams (fonte da verdade).
 * - Escrita: atualiza a URL com replace (não polui o histórico ao digitar).
 * Preserva os demais parâmetros já presentes na URL.
 */
export function useUrlParam(key, defaultValue = "") {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key) ?? defaultValue;
      const resolved = typeof next === "function" ? next(current) : next;
      if (resolved === defaultValue || resolved === "" || resolved === null || resolved === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(resolved));
      }
      setSearchParams(params, { replace: true });
    },
    [key, defaultValue, searchParams, setSearchParams]
  );

  return [value, setValue];
}

/**
 * Sincroniza um array (ex: gêneros selecionados) com um parâmetro da URL,
 * serializado como string separada por vírgulas.
 */
export function useUrlArrayParam(key) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(key) || "";
  const value = raw ? raw.split(",").filter(Boolean) : [];

  const setValue = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key) || "";
      const curArr = current ? current.split(",").filter(Boolean) : [];
      const resolved = typeof next === "function" ? next(curArr) : next;
      if (!resolved || resolved.length === 0) {
        params.delete(key);
      } else {
        params.set(key, resolved.join(","));
      }
      setSearchParams(params, { replace: true });
    },
    [key, searchParams, setSearchParams]
  );

  return [value, setValue];
}