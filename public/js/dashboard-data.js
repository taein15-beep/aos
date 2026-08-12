/**
 * AOS Dashboard Sample Data
 * 테스트용 샘플 데이터 (실제 개인정보/운영 데이터 아님)
 */
(function (global) {
  'use strict';

  global.AOSDashboardData = {
    meta: {
      title: '대시보드',
      description: '오늘의 예약과 출발, 결제 및 주요 업무를 확인하세요.',
      updatedAt: '2026-08-12 09:40',
      version: 'AOS Travel ERP v1.0'
    },

    kpis: [
      {
        key: 'newReservations',
        label: '오늘 신규예약',
        value: '18건',
        icon: '▤',
        iconClass: 'up',
        note: '↑ 전일 대비 12.5%',
        noteClass: 'up'
      },
      {
        key: 'paymentAmount',
        label: '오늘 결제금액',
        value: '12,850,000원',
        icon: '₩',
        iconClass: 'up',
        note: '↑ 전일 대비 8.2%',
        noteClass: 'up'
      },
      {
        key: 'receivable',
        label: '미수금',
        value: '3,420,000원',
        icon: '!',
        iconClass: 'warn',
        note: '결제기한 임박 4건',
        noteClass: 'warn'
      },
      {
        key: 'departure',
        label: '오늘 출발',
        value: '5상품 · 86명',
        icon: '✈',
        iconClass: 'info',
        note: '출발확정 4 · 모객중 1',
        noteClass: 'info'
      },
      {
        key: 'cancelRequest',
        label: '예약 취소요청',
        value: '3건',
        icon: '×',
        iconClass: 'danger',
        note: '24시간 경과 1건',
        noteClass: 'danger'
      },
      {
        key: 'settlement',
        label: '정산 대기',
        value: '12건',
        icon: '⇄',
        iconClass: 'warn',
        note: '이번 주 7건 마감',
        noteClass: 'warn'
      }
    ],

    quickActions: [
      { label: '신규 상품 등록', icon: '＋' },
      { label: '예약 등록', icon: '＋' },
      { label: '고객 검색', icon: '⌕' },
      { label: '요금 설정', icon: '₩' },
      { label: '예약달력', icon: '▦' },
      { label: '정산서 확인', icon: '▤' }
    ],

    departuresToday: [
      {
        time: '09:00',
        productName: '다낭·호이안·바나힐 5일',
        productCode: 'PDT-TRV-2026-031',
        period: '3박 5일',
        people: 18,
        composition: '대15 / 소3 / 유0',
        seats: '2석',
        seatsLow: true,
        paidCount: 14,
        dueCount: 2,
        dueAmount: '680,000원',
        manager: '김태인',
        status: '출발확정',
        statusClass: 'success'
      },
      {
        time: '10:30',
        productName: '백두산·연길·용정 5일',
        productCode: 'PDT-TRV-2026-042',
        period: '4박 5일',
        people: 24,
        composition: '대21 / 소3 / 유0',
        seats: '마감',
        seatsLow: false,
        paidCount: 19,
        dueCount: 0,
        dueAmount: null,
        manager: '이서준',
        status: '출발확정',
        statusClass: 'success'
      },
      {
        time: '13:20',
        productName: '울란바토르·테를지 5일',
        productCode: 'PDT-TRV-2026-058',
        period: '4박 5일',
        people: 16,
        composition: '대14 / 소2 / 유0',
        seats: '3석',
        seatsLow: true,
        paidCount: 12,
        dueCount: 1,
        dueAmount: '420,000원',
        manager: '박소연',
        status: '모객중',
        statusClass: 'warn'
      },
      {
        time: '18:45',
        productName: '오사카·교토·고베 4일',
        productCode: 'PDT-TRV-2026-017',
        period: '3박 4일',
        people: 28,
        composition: '대25 / 소2 / 유1',
        seats: '마감',
        seatsLow: false,
        paidCount: 23,
        dueCount: 0,
        dueAmount: null,
        manager: '정민수',
        status: '마감',
        statusClass: 'danger'
      }
    ],

    salesChart: {
      periods: ['오늘', '최근 7일', '최근 30일', '이번 달'],
      activePeriod: '최근 7일',
      summary: [
        { label: '예약금액', value: '45,280,000원', change: '↑ 12.4%', down: false },
        { label: '결제금액', value: '38,960,000원', change: '↑ 8.7%', down: false },
        { label: '미수금', value: '6,320,000원', change: '↓ 3.1%', down: true }
      ],
      bars: [
        { label: '8/4', reservation: 48, payment: 32 },
        { label: '8/5', reservation: 56, payment: 40 },
        { label: '8/6', reservation: 43, payment: 27 },
        { label: '8/7', reservation: 68, payment: 52 },
        { label: '8/8', reservation: 61, payment: 45 },
        { label: '8/9', reservation: 82, payment: 66 },
        { label: '8/10', reservation: 74, payment: 58 }
      ]
    },

    reservationStatus: {
      total: 324,
      items: [
        { label: '예약확정', count: 241, percent: '74.4%', tone: 'success' },
        { label: '예약접수', count: 28, percent: '8.6%', tone: 'info' },
        { label: '대기', count: 18, percent: '5.6%', tone: 'warn' },
        { label: '취소요청', count: 7, percent: '2.2%', tone: 'danger' },
        { label: '취소완료', count: 30, percent: '9.2%', tone: 'gray' }
      ]
    },

    recentReservations: {
      total: 18,
      pageSize: 6,
      rows: [
        {
          code: 'R260810-018',
          timeLabel: '오늘 16:42',
          productName: '다낭·호이안·바나힐 5일',
          departure: '08.24',
          guest: '김민지',
          people: 3,
          totalAmount: '3,270,000원',
          dueAmount: null,
          reserveStatus: '예약확정',
          reserveClass: 'success',
          paymentStatus: '결제완료',
          paymentClass: 'success',
          channel: '본사 홈페이지'
        },
        {
          code: 'R260810-017',
          timeLabel: '오늘 16:18',
          productName: '몽골 대초원·테를지 5일',
          departure: '08.13',
          guest: '이영수',
          people: 2,
          totalAmount: '2,180,000원',
          dueAmount: '680,000원',
          reserveStatus: '예약확정',
          reserveClass: 'success',
          paymentStatus: '부분결제',
          paymentClass: 'warn',
          channel: '고양여행클럽'
        },
        {
          code: 'R260810-016',
          timeLabel: '오늘 15:55',
          productName: '장가계·천문산 6일',
          departure: '08.20',
          guest: '박은주',
          people: 4,
          totalAmount: '4,760,000원',
          dueAmount: '4,760,000원',
          reserveStatus: '예약접수',
          reserveClass: 'warn',
          paymentStatus: '미결제',
          paymentClass: 'danger',
          channel: '관리자 직접등록'
        },
        {
          code: 'R260810-015',
          timeLabel: '오늘 14:31',
          productName: '홋카이도 여름 4일',
          departure: '08.18',
          guest: '최성호',
          people: 2,
          totalAmount: '2,980,000원',
          dueAmount: null,
          reserveStatus: '예약확정',
          reserveClass: 'success',
          paymentStatus: '결제완료',
          paymentClass: 'success',
          channel: '행복투어 일산점'
        },
        {
          code: 'R260810-014',
          timeLabel: '오늘 13:08',
          productName: '대만 핵심일주 4일',
          departure: '08.27',
          guest: '윤서현',
          people: 3,
          totalAmount: '2,490,000원',
          dueAmount: '990,000원',
          reserveStatus: '대기',
          reserveClass: 'warn',
          paymentStatus: '부분결제',
          paymentClass: 'warn',
          channel: '본사 홈페이지'
        },
        {
          code: 'R260810-013',
          timeLabel: '오늘 11:46',
          productName: '오사카·교토·고베 4일',
          departure: '08.10',
          guest: '강지훈',
          people: 1,
          totalAmount: '1,150,000원',
          dueAmount: null,
          reserveStatus: '취소요청',
          reserveClass: 'danger',
          paymentStatus: '환불진행',
          paymentClass: 'info',
          channel: '투어파트너'
        }
      ]
    },

    tasks: {
      total: 24,
      items: [
        { label: '취소 승인', count: 3, tone: 'danger' },
        { label: '미수금 확인', count: 4, tone: 'warn' },
        { label: '여권 미등록', count: 5, tone: 'info' },
        { label: '정산 승인', count: 12, tone: 'purple' }
      ]
    },

    alerts: {
      summary: [
        { label: '긴급', count: 2, tone: 'danger' },
        { label: '주의', count: 5, tone: 'warn' },
        { label: '처리필요', count: 12, tone: 'purple' }
      ],
      items: [
        { tag: '긴급', tagClass: 'danger', text: '오늘 출발 상품 중 미수금 예약 2건이 있습니다.' },
        { tag: '주의', tagClass: 'warn', text: '여권정보 미등록 고객 5명이 있습니다.' },
        { tag: '좌석', tagClass: 'info', text: '몽골 5일 상품의 잔여좌석이 3석입니다.' },
        { tag: '정산', tagClass: 'info', text: '판매점 정산 12건이 승인 대기 중입니다.' },
        { tag: '예약', tagClass: 'gray', text: '취소요청 3건이 아직 처리되지 않았습니다.' }
      ]
    },

    schedules: [
      {
        date: '08.11',
        weekday: '화',
        name: '장가계·천문산 6일',
        meta: '예약 24명 · 인천 출발',
        status: '출발확정',
        statusClass: 'success'
      },
      {
        date: '08.12',
        weekday: '수',
        name: '다낭·호이안·바나힐 5일',
        meta: '예약 21명 · 인천 출발',
        status: '출발확정',
        statusClass: 'success'
      },
      {
        date: '08.13',
        weekday: '목',
        name: '몽골 대초원·테를지 5일',
        meta: '예약 16명 · 인천 출발',
        status: '모객중',
        statusClass: 'warn'
      },
      {
        date: '08.13',
        weekday: '목',
        name: '오사카·교토·고베 4일',
        meta: '예약 28명 · 인천 출발',
        status: '마감',
        statusClass: 'danger'
      }
    ],

    departureSummary: [
      { label: '출발예정', value: '18상품', tone: 'info' },
      { label: '출발확정', value: '14상품', tone: 'success' },
      { label: '모객중', value: '3상품', tone: 'warn' },
      { label: '미수금 보유', value: '4예약', tone: 'danger' }
    ],

    receivables: [
      {
        code: 'R260807-084',
        guest: '이영수',
        productName: '몽골 대초원·테를지 5일',
        departure: '08.13',
        totalAmount: '2,180,000원',
        paidAmount: '1,500,000원',
        dueAmount: '680,000원',
        dueLabel: '오늘까지',
        dueClass: 'today',
        departureLabel: 'D-2',
        departureClass: 'departure-due urgent'
      },
      {
        code: 'R260806-072',
        guest: '오정희',
        productName: '다낭·호이안·바나힐 5일',
        departure: '08.12',
        totalAmount: '3,270,000원',
        paidAmount: '2,000,000원',
        dueAmount: '1,270,000원',
        dueLabel: '결제기한 초과',
        dueClass: 'overdue',
        departureLabel: 'D-1',
        departureClass: 'departure-due urgent'
      },
      {
        code: 'R260808-105',
        guest: '한승민',
        productName: '백두산·연길·용정 5일',
        departure: '08.16',
        totalAmount: '2,380,000원',
        paidAmount: '1,900,000원',
        dueAmount: '480,000원',
        dueLabel: 'D-2',
        dueClass: '',
        departureLabel: '출발임박',
        departureClass: 'departure-due urgent'
      },
      {
        code: 'R260805-061',
        guest: '윤서현',
        productName: '대만 핵심일주 4일',
        departure: '08.27',
        totalAmount: '2,490,000원',
        paidAmount: '1,500,000원',
        dueAmount: '990,000원',
        dueLabel: '08.15',
        dueClass: '',
        departureLabel: 'D-17',
        departureClass: 'departure-due'
      }
    ],

    channels: [
      { key: 'direct', label: '본사 홈페이지', percent: 48, count: 156 },
      { key: 'agency', label: '판매점', percent: 32, count: 104 },
      { key: 'admin', label: '관리자 직접등록', percent: 15, count: 49 },
      { key: 'etc', label: '기타', percent: 5, count: 15 }
    ],

    topAgencies: [
      { rank: 1, name: '행복투어 일산점', reservations: 28, people: 62, sales: '78,450,000원', settlement: '7,845,000원' },
      { rank: 2, name: '고양여행클럽', reservations: 22, people: 51, sales: '62,180,000원', settlement: '6,218,000원' },
      { rank: 3, name: '투어파트너', reservations: 19, people: 43, sales: '51,920,000원', settlement: '5,192,000원' },
      { rank: 4, name: '하나로여행', reservations: 16, people: 38, sales: '45,360,000원', settlement: '4,536,000원' },
      { rank: 5, name: '좋은여행사', reservations: 13, people: 29, sales: '34,780,000원', settlement: '3,478,000원' }
    ]
  };
})(window);
