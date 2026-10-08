"use client";

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState
} from "react";

export type WorldQuality = "high" | "balanced" | "performance";

export type GalleryItem = {
  id: string;
  kind: "image" | "text";
  title: string;
  value: string;
};

type WorldSection =
  | "home"
  | "visit"
  | "create"
  | "ai"
  | "memory"
  | "control";

type Props = {
  lowPower: boolean;
  quality: WorldQuality;
  motion: boolean;
  activeSection: WorldSection;
  gallery: boolean;
  galleryItems: GalleryItem[];
  onNavigate: (section: WorldSection) => void;
  onGallerySelect?: (item: GalleryItem) => void;
};

export default function World2D({
  lowPower,
  quality,
  motion,
  activeSection,
  gallery,
  galleryItems,
  onNavigate,
  onGallerySelect
}: Props) {
  const areaRef = useRef<HTMLDivElement | null>(null);

  const [player, setPlayer] = useState({
    x: 50,
    y: 58
  });

  const [dragging, setDragging] = useState(false);

  const dragRef = useRef({
    id: -1,
    x: 0,
    y: 0
  });

  const movePlayer = (clientX: number, clientY: number) => {
    const area = areaRef.current;
    if (!area) return;

    const rect = area.getBoundingClientRect();

    const x =
      ((clientX - rect.left) / rect.width) * 100;

    const y =
      ((clientY - rect.top) / rect.height) * 100;

    setPlayer({
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(12, Math.min(82, y))
    });
  };

  const onPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );

    setDragging(true);

    movePlayer(
      event.clientX,
      event.clientY
    );
  };

  const onPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      dragRef.current.id !== event.pointerId
    ) {
      return;
    }

    const dx =
      event.clientX - dragRef.current.x;

    const dy =
      event.clientY - dragRef.current.y;

    if (Math.abs(dx) + Math.abs(dy) < 1) {
      return;
    }

    dragRef.current.x = event.clientX;
    dragRef.current.y = event.clientY;

    movePlayer(
      event.clientX,
      event.clientY
    );
  };

  const stopDragging = (
    event?: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      event &&
      dragRef.current.id !== event.pointerId
    ) {
      return;
    }

    dragRef.current.id = -1;
    setDragging(false);
  };

  useEffect(() => {
    setPlayer({
      x: 50,
      y: 58
    });
  }, [activeSection, gallery]);

  const handleGalleryClick = (
    event: React.MouseEvent,
    item: GalleryItem
  ) => {
    event.stopPropagation();
    onGallerySelect?.(item);
  };

  const handleGalleryPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
  };

  return (
    <div
      ref={areaRef}
      className={`world-2d ${
        dragging ? "is-dragging" : ""
      } quality-${quality} ${
        lowPower ? "low-power" : ""
      } ${
        motion ? "motion-on" : "motion-off"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={(event) => {
        if (
          event.currentTarget.hasPointerCapture?.(
            event.pointerId
          )
        ) {
          return;
        }

        stopDragging(event);
      }}
    >
      <div className="world-2d-sky" />
      <div className="world-2d-grid" />

      <div className="room-ceiling-light light-one" />
      <div className="room-ceiling-light light-two" />
      <div className="room-ceiling-light light-three" />

      {gallery ? (
        <div className="room-2d gallery-room">
          <div className="room-wall room-wall-back" />
          <div className="room-wall room-wall-left" />
          <div className="room-wall room-wall-right" />
          <div className="room-floor" />

          <div className="gallery-frames">
            {(
              galleryItems.length
                ? galleryItems.slice(0, 8)
                : [
                    {
                      id: "demo-1",
                      kind: "text" as const,
                      title: "خوش آمدید",
                      value: "این اتاق بازدید Amirverse است"
                    },
                    {
                      id: "demo-2",
                      kind: "text" as const,
                      title: "Amirverse",
                      value: "محتوای عمومی این دنیا"
                    },
                    {
                      id: "demo-3",
                      kind: "text" as const,
                      title: "گالری",
                      value: "مواردی که در اینجا قرار می‌گیرند برای همه قابل مشاهده‌اند"
                    }
                  ]
            ).map((item) => (
              <button
                key={item.id}
                className="gallery-frame-2d"
                onPointerDown={
                  handleGalleryPointerDown
                }
                onClick={(event) =>
                  handleGalleryClick(event, item)
                }
              >
                {item.kind === "image" ? (
                  <img
                    src={item.value}
                    alt={item.title}
                  />
                ) : (
                  <span>
                    {item.value.split("\n")[0]}
                  </span>
                )}

                <small>{item.title}</small>
              </button>
            ))}
          </div>

          <div className="room-door" />


          <div className="floor-marker">
            <span>↕</span>
            <small>
              انگشتت را روی صفحه بکش و حرکت کن
            </small>
          </div>
        </div>
      ) : (
        <div className="room-2d main-room">
          <div className="room-wall room-wall-back" />
          <div className="room-wall room-wall-left" />
          <div className="room-wall room-wall-right" />
          <div className="room-floor" />

          <div className="central-core-2d">
            <div className="core-ring" />

            <div className="core-orb">
              <span className="core-orb-mark">A</span>
            </div>

            <span>AMIRVERSE</span>
          </div>
          <div className="world-stations">
            <button className="world-station station-visit" onPointerDown={(event) => event.stopPropagation()} onClick={() => onNavigate("visit")}>
              <span>◈</span><strong>بازدید</strong><small>WORLD</small>
            </button>
            <button className="world-station station-create" onPointerDown={(event) => event.stopPropagation()} onClick={() => onNavigate("create")}>
              <span>✦</span><strong>ساخت</strong><small>CREATE</small>
            </button>
            <button className="world-station station-ai" onPointerDown={(event) => event.stopPropagation()} onClick={() => onNavigate("ai")}>
              <span>AI</span><strong>هوش مصنوعی</strong><small>INTELLIGENCE</small>
            </button>
            <button className="world-station station-memory" onPointerDown={(event) => event.stopPropagation()} onClick={() => onNavigate("memory")}>
              <span>◉</span><strong>حافظه</strong><small>MEMORY</small>
            </button>
            <button className="world-station station-control" onPointerDown={(event) => event.stopPropagation()} onClick={() => onNavigate("control")}>
              <span>⚙</span><strong>کنترل</strong><small>SYSTEM</small>
            </button>
          </div>

          <div className="room-furniture desk" />
          <div className="room-furniture console" />
          <div className="room-furniture sofa" />

          <div className="floor-marker">
            <span>↕</span>
            <small>
              برای حرکت، انگشتت را روی صفحه بکش
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

function Player2D({
  x,
  y,
  dragging,
  motion
}: {
  x: number;
  y: number;
  dragging: boolean;
  motion: boolean;
}) {
  return (
    <div
      className={`player-2d ${
        dragging ? "dragging" : ""
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`
      }}
    >
      <div
        className={`player-shadow ${
          motion ? "floating" : ""
        }`}
      />

      <div className="player-body">
        <div className="player-head" />
        <div className="player-torso" />
        <div className="player-leg left" />
        <div className="player-leg right" />
        <div className="player-glow" />
      </div>

      <span className="player-name">
        Amir
      </span>
    </div>
  );
}
