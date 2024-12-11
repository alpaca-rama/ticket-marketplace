'use client';

import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useStorageUrl } from "@/lib/utils";
import Spinner from "@/components/Spinner";
import Image from "next/image";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import JoinQueue from "@/components/JoinQueue";

export default function EventPage() {
  const { user } = useUser();
  const params = useParams();
  const event = useQuery(api.events.getById, { eventId: params.id as Id<'events'> });
  const availability = useQuery(api.events.getEventAvailability, { eventId: params.id as Id<'events'> });
  const imageUrl = useStorageUrl(event?.imageStorageId);

  if (!event || !availability) {
    return (
      <div className={'min-h-screen flex items-center justify-center'}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className={'min-h-screen bg-gray-50'}>
      {/* EVENT DETAILS */}
      <div className={'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'}>
        <div className={'bg-white rounded-xl shadow-sm overflow-hidden'}>
          {/* EVENT IMAGE */}
          {imageUrl && (
            <div className={'aspect-[21/9] relative w-full'}>
              <Image
                src={imageUrl}
                alt={event.name}
                fill
                className={'object-cover'}
                priority
              />
            </div>
          )}

          {/* EVENT DETAILS IN DEPTH */}
          <div className={'p-8'}>
            <div className={'grid grid-cols-1 lg:grid-cols-2 gap-12'}>
              {/* LEFT COLUMN - EVENT DETAILS */}
              <div className={'space-y-8'}>
                <div>
                  <h1 className={'text-4xl font-bold text-gray-900 mb-4'}>{event.name}</h1>
                  <p className={'text-lg text-gray-600'}>{event.description}</p>
                </div>

                <div className={'grid grid-cols-2 gap-6'}>
                  {/* CARD 1 */}
                  <div className={'bg-gray-50 p-4 rounded-lg border border-gray-100'}>
                    <div className={'flex items-center text-gray-600 mb-1'}>
                      <CalendarDays className={'w-5 h-5 mr-2 text-blue-600'} />
                      <span className={'text-sm font-medium'}>Date</span>
                    </div>
                    <p className={'text-gray-900'}>
                      {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* CARD 2 */}
                  <div className={'bg-gray-50 p-4 rounded-lg border border-gray-100'}>
                    <div className={'flex items-center text-gray-600 mb-1'}>
                      <MapPin className={'w-5 h-5 mr-2 text-blue-600'} />
                      <span className={'text-sm font-medium'}>Location</span>
                    </div>
                    <p className={'text-gray-900'}>
                      {event.location}
                    </p>
                  </div>

                  {/* CARD 3 */}
                  <div className={'bg-gray-50 p-4 rounded-lg border border-gray-100'}>
                    <div className={'flex items-center text-gray-600 mb-1'}>
                      <Ticket className={'w-5 h-5 mr-2 text-blue-600'} />
                      <span className={'text-sm font-medium'}>Price</span>
                    </div>
                    <p className={'text-gray-900'}>
                      R {event.price.toFixed(2)}
                    </p>
                  </div>

                  {/* CARD 4 */}
                  <div className={'bg-gray-50 p-4 rounded-lg border border-gray-100'}>
                    <div className={'flex items-center text-gray-600 mb-1'}>
                      <Ticket className={'w-5 h-5 mr-2 text-blue-600'} />
                      <span className={'text-sm font-medium'}>Availability</span>
                    </div>
                    <p className={'text-gray-900'}>
                      {availability.totalTickets - availability.purchasedCount}
                      {' '}
                      / {availability.totalTickets} left
                    </p>
                  </div>
                </div>

                {/* ADDITIONAL EVENT INFORMATION */}
                <div className={'bg-blue-50 border border-blue-100 rounded-lg p-6'}>
                  <h3 className={'text-lg font-semibold text-blue-900 mb-2'}>Event Information</h3>
                  <ul className={'space-y-2 text-blue-700'}>
                    <li>&#x25CF; Please arrive 30 mmiutes before the event starts</li>
                    <li>&#x25CF; Tickets are non-refundable</li>
                    <li>&#x25CF; Age restriction: 18+</li>
                  </ul>
                </div>
              </div>

              {/* RIGHT COLUMN - EVENT */}
              <div>
                <div className="sticky top-8 space-y-4">
                  <EventCard eventId={params.id as Id<"events">} />

                  {user ? (
                    <JoinQueue eventId={params.id as Id<"events">} userId={user.id} />
                  ) : (
                    <SignInButton>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                        Sign in to buy tickets
                      </Button>
                    </SignInButton>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}