# Plasmid-daemon

## Running with Docker

This is the reccomended way to get an instance up and running. 

To build your own docker image of the daemon run the following:

```bash
docker build -t <your username>/plasmid-daemon .
```
This will take a while the first time but be very quick after that.


Run the image using:

```
docker run -p 49160:8080 -d <your username>/plasmid-daemon
```

To bind it to port `49160`. Chose another port it desired.

Note this will only use temporary storage. 

## Persisting Feeds

If you want to persist the plasmid node data between runs you will need to create a docker volume for it and mount it when you run the image:

```bash
docker volume create plasmid-data
```

You can then mount this to where plasmid-daemon defaults to storing the data

```bash
docker run -p 49160:8080 -v plasmid-data:/var/lib/plasmid-store -d <your username>/plasmid-daemon
```
