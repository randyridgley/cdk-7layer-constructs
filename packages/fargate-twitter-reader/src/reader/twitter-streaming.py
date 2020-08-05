import tweepy
import boto3
import json


sm = boto3.client('secretsmanager')
twitter_config = json.loads(sm.get_secret_value(SecretId='/cdk-7layer-constructs/twitter-config')['SecretString'])

# Authenticate with Twitter API
auth = tweepy.OAuthHandler(twitter_config['twitter']['consumer_key'], twitter_config['twitter']['consumer_secret'])
auth.set_access_token(twitter_config['twitter']['access_token'], twitter_config['twitter']['access_token_secret'])

api = tweepy.API(auth)

# Authenticate with AWS
firehose = boto3.client("firehose")

# override tweepy.StreamListener to add logic
class TwitterStreamListener(tweepy.StreamListener):
    def on_connect(self):
        print("You're connected to the streaming server.")

    def on_data(self, data):
        firehose.put_record(DeliveryStreamName=twitter_config['kinesis_delivery'], Record={"Data": data + "\n" })
        print(json.loads(data)["text"])
        return True

    def on_status(self, status):
        print(status.text)

    def on_error(self, status_code):
        if status_code == 420:
            # returning False if on_error disconnects the stream
            return False


if __name__ == "__main__":

    listener = TwitterStreamListener()
    # Authenticate with Twitter API
    auth = tweepy.OAuthHandler(twitter_config['twitter']['consumer_key'], twitter_config['twitter']['consumer_secret'])
    auth.set_access_token(twitter_config['twitter']['access_token'], twitter_config['twitter']['access_token_secret'])


    stream = tweepy.Stream(auth, listener)
    # Filter by topics and languages
    stream.filter(track=twitter_config['topics'], languages=twitter_config['languages'])