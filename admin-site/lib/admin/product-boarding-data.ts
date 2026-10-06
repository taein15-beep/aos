/**
 * 상품별 탑승지 설정 샘플 데이터 (SAMPLE)
 * - 상품관리 > 탑승지 설정에서 탑승지 그룹을 등록하고, 운영배정에서 호차별로 그룹을 선택합니다.
 * - DB/API 연동 전까지 새로고침 시 초기화되는 프론트 Mock 저장소를 사용합니다.
 */
import { getSampleProducts } from "@/lib/admin/products-data";
import { getReservationList } from "@/lib/admin/reservations-data";

/**
 * 개별 탑승지. 탑승 순서는 그룹 내 배열 순서입니다.
 * 집결장소 상세설명·집결시간·주소·안내메모는 향후 확장 항목이며 현재 화면에서는 사용하지 않습니다.
 */
export type ProductBoardingPoint = {
  id: string;
  name: string;
  meetingPlace?: string;
  meetingTime?: string;
  address?: string;
  memo?: string;
};

/** 탑승지 그룹 (예: 탑승지A). 운영배정에서 호차마다 하나씩 선택합니다. */
export type ProductBoardingGroup = {
  id: string;
  name: string;
  points: ProductBoardingPoint[];
};

export type BoardingProduct = { code: string; name: string; category: string; inProductList: boolean };

const group = (id: string, name: string, points: string[]): ProductBoardingGroup => ({
  id,
  name,
  points: points.map((point, index) => ({ id: `${id}-P${index + 1}`, name: point })),
});

const SAMPLE_BOARDING_GROUPS: Record<string, ProductBoardingGroup[]> = {
  "GC-WINE01": [
    group("BG-A", "탑승지A", ["서울역", "영등포", "잠실종합운동장"]),
    group("BG-B", "탑승지B", ["서울역", "영등포역", "수원역", "탄현역", "서대전역"]),
    group("BG-C", "탑승지C", ["서울역", "신길역", "잠실역"]),
  ],
};

const sessionBoardingGroups: Record<string, ProductBoardingGroup[]> = {};

export function cloneBoardingGroups(groups: ProductBoardingGroup[]) {
  return groups.map((item) => ({ ...item, points: item.points.map((point) => ({ ...point })) }));
}

export function getProductBoardingGroups(code: string) {
  return cloneBoardingGroups(sessionBoardingGroups[code] ?? SAMPLE_BOARDING_GROUPS[code] ?? []);
}

export function saveProductBoardingGroups(code: string, groups: ProductBoardingGroup[]) {
  sessionBoardingGroups[code] = cloneBoardingGroups(groups);
}

export function formatBoardingRoute(item: ProductBoardingGroup) {
  return item.points.map((point) => point.name).join(" → ") || "등록된 탑승지 없음";
}

/**
 * 탑승지를 관리할 수 있는 상품 목록.
 * 상품목록 SAMPLE에 없는 예약 상품은 상품명 기준 임시 코드(PRD-RSV-NN)로 관리합니다.
 */
export function listBoardingProducts(): BoardingProduct[] {
  const products = new Map<string, BoardingProduct>();
  getSampleProducts().forEach((product) => {
    if (products.has(product.code)) return;
    products.set(product.code, {
      code: product.code,
      name: product.name,
      category: product.category,
      inProductList: true,
    });
  });
  const knownNames = new Set(Array.from(products.values()).map((product) => product.name));
  const extraNames = Array.from(new Set(getReservationList().map((item) => item.productName)))
    .filter((name) => !knownNames.has(name))
    .sort((a, b) => a.localeCompare(b));
  extraNames.forEach((name, index) => {
    const code = `PRD-RSV-${String(index + 1).padStart(2, "0")}`;
    products.set(code, { code, name, category: "예약 상품 (상품목록 미등록 SAMPLE)", inProductList: false });
  });
  return Array.from(products.values());
}

export function findBoardingProduct(code: string) {
  return listBoardingProducts().find((product) => product.code === code) ?? null;
}

export function resolveBoardingProductCode(productName: string) {
  return listBoardingProducts().find((product) => product.name === productName)?.code ?? "";
}
