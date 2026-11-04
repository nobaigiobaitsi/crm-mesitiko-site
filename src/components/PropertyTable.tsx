import { Building2, ChevronRight } from "lucide-react";
import { money, type Entry, type Member } from "../domain/model";
import { Badge, Empty, Person } from "./Common";

export function PropertyTable({
  entries,
  members,
  onOpen,
  compact = false,
}: {
  entries: Entry[];
  members: Member[];
  onOpen: (entry: Entry) => void;
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ΑΚΙΝΗΤΟ</th>
            <th>ΤΙΜΗ</th>
            <th>ΚΑΤΑΣΤΑΣΗ</th>
            {!compact && <th>ΕΓΚΡΙΣΗ</th>}
            <th>ΥΠΕΥΘΥΝΟΣ</th>
            <th>
              <span className="sr-only">Άνοιγμα</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id} onClick={() => onOpen(entry)}>
              <td>
                <button
                  className="property-cell"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(entry);
                  }}
                >
                  <span className={`building-art art-${index % 4}`}>
                    {entry.data.photo?.startsWith("https://") ? (
                      <img
                        src={entry.data.photo}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Building2 size={25} />
                    )}
                  </span>
                  <span>
                    <strong>{entry.data.title}</strong>
                    <small>
                      {entry.data.code}
                      <b>·</b>
                      {entry.data.area}
                      <b>·</b>
                      {entry.data.sqm} τ.μ.
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <strong className="price">{money(entry.data.price)}</strong>
                <small>{entry.data.transaction}</small>
              </td>
              <td>
                <Badge value={entry.data.status} />
              </td>
              {!compact && (
                <td>
                  <Badge value={entry.data.publication} />
                </td>
              )}
              <td>
                <Person members={members} id={entry.assigned_to} />
              </td>
              <td>
                <ChevronRight size={17} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!entries.length && (
        <Empty label="Δεν υπάρχουν ακίνητα με αυτά τα κριτήρια." />
      )}
    </div>
  );
}
