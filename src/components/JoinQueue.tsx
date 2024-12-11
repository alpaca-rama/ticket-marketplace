'use client';

import { useToast } from "@/hooks/use-toast";
import { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ConvexError } from "convex/values";
import Spinner from "./Spinner";
import { WAITING_LIST_STATUS } from "../../convex/constants";
import { Clock, OctagonXIcon } from "lucide-react";

interface JoinQueueProps {
  eventId: Id<'events'>,
  userId: string,
}

export default function JoinQueue({ eventId, userId }: JoinQueueProps) {
  const { toast } = useToast();
  const joinWaitingList = useMutation(api.events.joinWaitingList);
  const queuePosition = useQuery(api.waitingList.getQueuePosition, { eventId, userId });
  const userTicket = useQuery(api.tickets.getUserTicketForEvent, { eventId, userId });
  const availability = useQuery(api.events.getEventAvailability, { eventId });
  const event = useQuery(api.events.getById, { eventId });
  const isEventOwner = userId === event?.userId;

  const handleJoinQueue = async () => {
    try {
      const result = await joinWaitingList({ eventId, userId });

      if (result.success) {
        console.log('Successfully joined waiting list');
        toast({
          title: result.message,
          duration: 5000,
        });
      }
    } catch (error) {
      if (error instanceof ConvexError && error.message.includes('joined the waiting list too many times')) {
        toast({
          variant: 'destructive',
          title: 'Slow down there!',
          description: error.data,
          duration: 5000,
        });
      } else {
        console.error('Error joining waiting list', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: 'Failed to join queue. Please try again later.',
        });
      }
    }
  }

  if (queuePosition === undefined || availability === undefined || !event) {
    return <Spinner />
  }

  if (userTicket) {
    return null;
  }

  const isPastEvent = event.eventDate < Date.now();

  return (
    <div>
      {/* if the user is not on the waiting list, or if the waiting list offer has expired, or if the waiting list offer has been accepted and the offer has expired, show the join waiting list button */}
      {(!queuePosition ||
        queuePosition.status === WAITING_LIST_STATUS.EXPIRED ||
        (queuePosition.status === WAITING_LIST_STATUS.OFFERED &&
          queuePosition.offerExpiresAt &&
          queuePosition.offerExpiresAt <= Date.now())) && (
          <>
            {/* if the user is the event owner, don't show the button */}
            {isEventOwner ? (
              <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg">
                <OctagonXIcon className="w-5 h-5" />
                <span>You cannot buy a ticket for your own event</span>
              </div>
            ) : /* if the event has ended, show a message saying the event has ended */
              isPastEvent ? (
                <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
                  <Clock className="w-5 h-5" />
                  <span>Event has ended</span>
                </div>
              ) : /* if the event is sold out, show a message saying the event is sold out */
                availability.purchasedCount >= availability?.totalTickets ? (
                  <div className="text-center p-4">
                    <p className="text-lg font-semibold text-red-600">
                      Sorry, this event is sold out
                    </p>
                  </div>
                ) : (
                  /* otherwise, show the join waiting list button */
                  <button
                    onClick={handleJoinQueue}
                    disabled={isPastEvent || isEventOwner}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Buy Ticket
                  </button>
                )}
          </>
        )}
    </div>
  );
}