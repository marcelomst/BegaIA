services:
  begasist-channelbot-hotel999:
    image: begasist-channelbot:latest
    environment:
      - HOTEL_ID=hotel999

  begasist-channelbot-hotelconrad:
    image: begasist-channelbot:latest
    environment:
      - HOTEL_ID=hotelconrad

  begasist-channelbot-hotelplaza:
    image: begasist-channelbot:latest
    environment:
      - HOTEL_ID=hotelplaza
