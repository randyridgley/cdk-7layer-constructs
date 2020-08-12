import { Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import * as ft from '@cdk-7layer-constructs/fargate-twitter-reader';
import * as kft from '@cdk-7layer-constructs/kinesis-firehose-transformer';
import * as s3 from '@aws-cdk/aws-s3';
import * as glue from '@aws-cdk/aws-glue';
import * as ec2 from '@aws-cdk/aws-ec2';

export class FargateTwitterReaderAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const db = new glue.Database(this, 'TwitterDatabase', {
      databaseName: 'twitter'
    });

    const bucket = new s3.Bucket(this, 'TwitterBucket', {
      removalPolicy: RemovalPolicy.DESTROY      
    });

    const tweetColumns = [
      {
        name: "created_at",
        type: glue.Schema.STRING
      },
      {
        name: "id",
        type: glue.Schema.BIG_INT
      },
      {
        name: "id_str",
        type: glue.Schema.STRING
      },
      {
        name: "text",
        type: glue.Schema.STRING
      },
      {
        name: "source",
        type: glue.Schema.STRING
      },
      {
        name: "truncated",
        type: glue.Schema.BOOLEAN
      },
      {
        name: "user",
        type: glue.Schema.struct([
          {name: "id", type: glue.Schema.BIG_INT}, 
          {name: "id_str", type: glue.Schema.STRING}, 
          {name: "name", type: glue.Schema.STRING}, 
          {name: "screen_name", type: glue.Schema.STRING}, 
          {name: "location", type: glue.Schema.STRING}, 
          {name: "url", type: glue.Schema.STRING}, 
          {name: "description", type: glue.Schema.STRING}, 
          {name: "translator_type", type: glue.Schema.STRING}, 
          {name: "protected", type: glue.Schema.BOOLEAN}, 
          {name: "verified", type: glue.Schema.BOOLEAN}, 
          {name: "followers_count", type: glue.Schema.INTEGER}, 
          {name: "friends_count", type: glue.Schema.INTEGER}, 
          {name: "listed_count", type: glue.Schema.INTEGER}, 
          {name: "favourites_count", type: glue.Schema.INTEGER}, 
          {name: "statuses_count", type: glue.Schema.INTEGER}, 
          {name: "created_at", type: glue.Schema.STRING}, 
          {name: "geo_enabled", type: glue.Schema.BOOLEAN}, 
          {name: "contributors_enabled", type: glue.Schema.BOOLEAN}, 
          {name: "is_translator", type: glue.Schema.BOOLEAN}, 
          {name: "profile_background_color", type: glue.Schema.STRING}, 
          {name: "profile_background_image_url", type: glue.Schema.STRING}, 
          {name: "profile_background_image_url_https", type: glue.Schema.STRING}, 
          {name: "profile_background_tile", type: glue.Schema.BOOLEAN}, 
          {name: "profile_link_color", type: glue.Schema.STRING}, 
          {name: "profile_sidebar_border_color", type: glue.Schema.STRING}, 
          {name: "profile_sidebar_fill_color", type: glue.Schema.STRING}, 
          {name: "profile_text_color", type: glue.Schema.STRING}, 
          {name: "profile_use_background_image", type: glue.Schema.BOOLEAN}, 
          {name: "profile_image_url", type: glue.Schema.STRING}, 
          {name: "profile_image_url_https", type: glue.Schema.STRING}, 
          {name: "profile_banner_url", type: glue.Schema.STRING}, 
          {name: "default_profile", type: glue.Schema.BOOLEAN}, 
          {name: "default_profile_image", type: glue.Schema.BOOLEAN}
        ])
      },
      {
        name: "retweeted_status",
        type: glue.Schema.struct([
          {name: "created_at", type: glue.Schema.STRING},
          {name: "id", type: glue.Schema.BIG_INT},
          {name: "id_str", type: glue.Schema.STRING},
          {name: "text", type: glue.Schema.STRING},
          {name: "display_text_range", type: glue.Schema.array(glue.Schema.INTEGER)},
          {name: "source", type: glue.Schema.STRING},
          {name: "truncated", type: glue.Schema.BOOLEAN},
          {
            name: "user", 
            type: glue.Schema.struct([
              {name: "id", type: glue.Schema.BIG_INT}, 
              {name: "id_str", type: glue.Schema.STRING}, 
              {name: "name", type: glue.Schema.STRING}, 
              {name: "screen_name", type: glue.Schema.STRING}, 
              {name: "location", type: glue.Schema.STRING}, 
              {name: "url", type: glue.Schema.STRING}, 
              {name: "description", type: glue.Schema.STRING}, 
              {name: "translator_type", type: glue.Schema.STRING}, 
              {name: "protected", type: glue.Schema.BOOLEAN}, 
              {name: "verified", type: glue.Schema.BOOLEAN}, 
              {name: "followers_count", type: glue.Schema.INTEGER}, 
              {name: "friends_count", type: glue.Schema.INTEGER}, 
              {name: "listed_count", type: glue.Schema.INTEGER}, 
              {name: "favourites_count", type: glue.Schema.INTEGER}, 
              {name: "statuses_count", type: glue.Schema.INTEGER}, 
              {name: "created_at", type: glue.Schema.STRING}, 
              {name: "geo_enabled", type: glue.Schema.BOOLEAN}, 
              {name: "contributors_enabled", type: glue.Schema.BOOLEAN}, 
              {name: "is_translator", type: glue.Schema.BOOLEAN}, 
              {name: "profile_background_color", type: glue.Schema.STRING}, 
              {name: "profile_background_image_url", type: glue.Schema.STRING}, 
              {name: "profile_background_image_url_https", type: glue.Schema.STRING}, 
              {name: "profile_background_tile", type: glue.Schema.BOOLEAN}, 
              {name: "profile_link_color", type: glue.Schema.STRING}, 
              {name: "profile_sidebar_border_color", type: glue.Schema.STRING}, 
              {name: "profile_sidebar_fill_color", type: glue.Schema.STRING}, 
              {name: "profile_text_color", type: glue.Schema.STRING}, 
              {name: "profile_use_background_image", type: glue.Schema.BOOLEAN}, 
              {name: "profile_image_url", type: glue.Schema.STRING}, 
              {name: "profile_image_url_https", type: glue.Schema.STRING}, 
              {name: "profile_banner_url", type: glue.Schema.STRING}, 
              {name: "default_profile", type: glue.Schema.BOOLEAN}, 
              {name: "default_profile_image", type: glue.Schema.BOOLEAN}
            ])
          },
          {name: "is_quote_status", type: glue.Schema.BOOLEAN},
          {name: "quote_count", type: glue.Schema.INTEGER},
          {name: "reply_count", type: glue.Schema.INTEGER},
          {name: "retweet_count", type: glue.Schema.INTEGER},
          {name: "favorite_count", type: glue.Schema.INTEGER},
          {name: "entities", type: glue.Schema.struct([
              {
                name: "hashtags", 
                type: glue.Schema.array(
                  glue.Schema.struct([
                      {name: "text", type: glue.Schema.STRING}, 
                      {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)}
                  ])
              )},
          ])},
          {name: "urls", type: glue.Schema.array(
            glue.Schema.struct([
              {name: "url", type: glue.Schema.STRING}, 
              {name: "expanded_url", type: glue.Schema.STRING}, 
              {name: "display_url", type: glue.Schema.STRING}, 
              {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)}, 
            ]))
          },
          {name: "user_mentions", type: glue.Schema.array(
            glue.Schema.struct([
              {name: "id", type: glue.Schema.BIG_INT}, 
              {name: "id_str", type: glue.Schema.STRING}, 
              {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)}, 
              {name: "name", type: glue.Schema.STRING}, 
              {name: "screen_name", type: glue.Schema.STRING}, 
            ]))
          },
          {name: "symbols", type: glue.Schema.array(
            glue.Schema.struct([                
              {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)},
              {name: "text", type: glue.Schema.STRING}
            ]))        
          },
          {
            name: "media", 
            type: glue.Schema.array(
              glue.Schema.struct([
                {name: "id", type: glue.Schema.BIG_INT},
                {name: "id_str", type: glue.Schema.STRING},
                {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)},
                {name: "media_url", type: glue.Schema.STRING},
                {name: "media_url_https", type: glue.Schema.STRING},
                {name: "url", type: glue.Schema.STRING},
                {name: "display_url", type: glue.Schema.STRING},
                {name: "expanded_url", type: glue.Schema.STRING},
                {name: "type", type: glue.Schema.STRING},
                {name: "sizes", type: glue.Schema.struct([
                  {
                    name: "medium", 
                    type: glue.Schema.struct([
                      {name: "w", type: glue.Schema.INTEGER},
                      {name: "h", type: glue.Schema.INTEGER},
                      {name: "resize", type: glue.Schema.STRING}
                    ])},
                    {
                      name: "thumb", 
                      type: glue.Schema.struct([
                        {name: "w", type: glue.Schema.INTEGER},
                        {name: "h", type: glue.Schema.INTEGER},
                        {name: "resize", type: glue.Schema.STRING}
                    ])},
                    {
                      name: "large", 
                      type: glue.Schema.struct([
                        {name: "w", type: glue.Schema.INTEGER},
                        {name: "h", type: glue.Schema.INTEGER},
                        {name: "resize", type: glue.Schema.STRING}
                    ])},
                    {
                      name: "small", 
                      type: glue.Schema.struct([
                        {name: "w", type: glue.Schema.INTEGER},
                        {name: "h", type: glue.Schema.INTEGER},
                        {name: "resize", type: glue.Schema.STRING}
                    ])}
                  ])},
              ])
          )},
          {
            name: "extended_entities", 
            type: glue.Schema.array(
              glue.Schema.struct([
                {name: "id", type: glue.Schema.BIG_INT},
                {name: "id_str", type: glue.Schema.STRING},
                {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)},
                {name: "media_url", type: glue.Schema.STRING},
                {name: "media_url_https", type: glue.Schema.STRING},
                {name: "url", type: glue.Schema.STRING},
                {name: "display_url", type: glue.Schema.STRING},
                {name: "expanded_url", type: glue.Schema.STRING},
                {name: "type", type: glue.Schema.STRING},
                {
                  name: "sizes", 
                  type: glue.Schema.struct([
                      {name: "medium", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                      {name: "thumb", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                      {name: "large", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                      {name: "small", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                  ])},
              ])
          )},
          {name: "favorited", type: glue.Schema.BOOLEAN},
          {name: "retweeted", type: glue.Schema.BOOLEAN},
          {name: "possibly_sensitive", type: glue.Schema.BOOLEAN},
          {name: "filter_level", type: glue.Schema.STRING},
          {name: "lang", type: glue.Schema.STRING}
        ])
      },
      {
          name: "is_quote_status",
          type: glue.Schema.BOOLEAN
      },
      {
          name: "quote_count",
          type: glue.Schema.INTEGER
      },
      {
          name: "reply_count",
          type: glue.Schema.INTEGER
      },
      {
          name: "retweet_count",
          type: glue.Schema.INTEGER
      },
      {
          name: "favorite_count",
          type: glue.Schema.INTEGER
      },
      {
          name: "entities",
          type: glue.Schema.struct([
            {
              name: "hashtags", 
              type: glue.Schema.array(
                glue.Schema.struct([
                    {name: "text", type: glue.Schema.STRING},
                    {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)}
                ]))
            },
            {name: "urls", type: glue.Schema.array(
              glue.Schema.struct([
                {name: "url", type: glue.Schema.STRING}, 
                {name: "expanded_url", type: glue.Schema.STRING}, 
                {name: "display_url", type: glue.Schema.STRING}, 
                {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)}, 
              ]))
            },
            {name: "user_mentions", type: glue.Schema.array(
                glue.Schema.struct([
                    {name: "screen_name", type: glue.Schema.STRING},
                    {name: "name", type: glue.Schema.STRING},
                    {name: "id", type: glue.Schema.BIG_INT},
                    {name: "id_str", type: glue.Schema.STRING},
                    {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)}
                ])
            )},
            {name: "symbols", type: glue.Schema.array(
              glue.Schema.struct([                
                {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)},
                {name: "text", type: glue.Schema.STRING}
              ]))        
            }, 
            {
              name: "media", 
              type: glue.Schema.array(
                glue.Schema.struct([
                  {name: "id", type: glue.Schema.BIG_INT},
                  {name: "id_str", type: glue.Schema.STRING},
                  {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)},                    
                  {name: "media_url", type: glue.Schema.STRING},
                  {name: "media_url_https", type: glue.Schema.STRING},
                  {name: "url", type: glue.Schema.STRING},
                  {name: "display_url", type: glue.Schema.STRING},
                  {name: "expanded_url", type: glue.Schema.STRING},                    
                  {name: "type", type: glue.Schema.STRING},
                  {name: "sizes", type: glue.Schema.struct([
                      {name: "medium", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                      {name: "thumb", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                      {name: "large", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                      {name: "small", type: glue.Schema.struct([
                          {name: "w", type: glue.Schema.INTEGER},
                          {name: "h", type: glue.Schema.INTEGER},
                          {name: "resize", type: glue.Schema.STRING},
                      ])},
                  ])},
                  {name: "source_status_id", type: glue.Schema.BIG_INT},
                  {name: "source_status_id_str", type: glue.Schema.STRING},
                  {name: "source_user_id", type: glue.Schema.BIG_INT},
                  {name: "source_user_id_str", type: glue.Schema.STRING}
                ]))
            }])
        },
        {
          name: "extended_entities",
          type: glue.Schema.struct([
            {
              name: "media", 
              type: glue.Schema.array(
                glue.Schema.struct([
                    {name: "id", type: glue.Schema.BIG_INT},
                    {name: "id_str", type: glue.Schema.STRING},
                    {name: "indices", type: glue.Schema.array(glue.Schema.INTEGER)},                    
                    {name: "media_url", type: glue.Schema.STRING},
                    {name: "media_url_https", type: glue.Schema.STRING},
                    {name: "url", type: glue.Schema.STRING},
                    {name: "display_url", type: glue.Schema.STRING},
                    {name: "expanded_url", type: glue.Schema.STRING},                    
                    {name: "type", type: glue.Schema.STRING},
                    {name: "sizes", type: glue.Schema.struct([
                        {name: "medium", type: glue.Schema.struct([
                            {name: "w", type: glue.Schema.INTEGER},
                            {name: "h", type: glue.Schema.INTEGER},
                            {name: "resize", type: glue.Schema.STRING},
                        ])},
                        {name: "thumb", type: glue.Schema.struct([
                            {name: "w", type: glue.Schema.INTEGER},
                            {name: "h", type: glue.Schema.INTEGER},
                            {name: "resize", type: glue.Schema.STRING},
                        ])},
                        {name: "large", type: glue.Schema.struct([
                            {name: "w", type: glue.Schema.INTEGER},
                            {name: "h", type: glue.Schema.INTEGER},
                            {name: "resize", type: glue.Schema.STRING},
                        ])},
                        {name: "small", type: glue.Schema.struct([
                            {name: "w", type: glue.Schema.INTEGER},
                            {name: "h", type: glue.Schema.INTEGER},
                            {name: "resize", type: glue.Schema.STRING},
                        ])},
                    ])},
                    {name: "source_status_id", type: glue.Schema.BIG_INT},
                    {name: "source_status_id_str", type: glue.Schema.STRING},
                    {name: "source_user_id", type: glue.Schema.BIG_INT},
                    {name: "source_user_id_str", type: glue.Schema.STRING}
                ]))
              }])
      },
      {
          name: "favorited",
          type: glue.Schema.BOOLEAN
      },
      {
          name: "retweeted",
          type: glue.Schema.BOOLEAN
      },
      {
          name: "possibly_sensitive",
          type: glue.Schema.BOOLEAN
      },
      {
          name: "filter_level",
          type: glue.Schema.STRING
      },
      {
          name: "lang",
          type: glue.Schema.STRING
      },
      {
          name: "timestamp_ms",
          type: glue.Schema.STRING
      }
    ]

    const vpc = new ec2.Vpc(this, "FargateVPC", {
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "FargatePublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      natGateways: 0,
    });

    const twitter = new kft.KinesisFirehoseTransformer(this, 'TwitterFirehose', {
      createEncryptionKey: true,
      deliveryStreamName: 'twitter-firehose-example',
      enableCloudwatchLogging: true,
      targetTableConfig: {
        columns: tweetColumns,
        databaseArn: db.databaseArn,
        tableName: 'r_twitter',
        s3BucketArn: bucket.bucketArn,
        s3prefix: 'twitter/raw/'
      },
      useLakeformation: true
    });

    const sg = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: vpc,
      securityGroupName: 'TwitterReaderSG',
      allowAllOutbound: true,
    })

    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    sg.addIngressRule(sg, ec2.Port.tcp(80));

    new ft.FargateTwitterReader(this, 'FargateTwitterReader', {
      kinesisFirehoseName: twitter.streamName,
      languages: ['en', 'es', 'fr'],
      topics: ['aws', 'cdk', 'devops'],
      twitterConfig: {
        consumerKey: this.node.tryGetContext('consumer_key'),
        consumerSecret: this.node.tryGetContext('consumer_secret'),
        accessToken: this.node.tryGetContext('access_token'),
        accessTokenSecret: this.node.tryGetContext('access_token_secret')   
      },
      serviceSecurityGroup: sg,
      vpc: vpc
    });    
  }
}
